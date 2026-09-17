using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;
using Numinds.Api.Services;

namespace Numinds.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController(
    NumindsDbContext db,
    IMetaConversionsApiService metaConversions,
    IEmailSender emailSender,
    IConfiguration configuration) : ControllerBase
{
    private string FrontendBaseUrl => configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";

    // POST /api/orders — anonymous is allowed, same reasoning as
    // InvitationsController.Create: a guest can be mid-checkout before ever
    // logging in. AmountUsd is computed here from PricingSettings (+ promo
    // discount) rather than trusted from the client — it's the "official"
    // order total an admin reconciles against the bank transfer they
    // actually receive.
    [HttpPost]
    public async Task<ActionResult<OrderCreatedResponse>> Create(
        CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.InvitationId, out var invitationId))
        {
            return BadRequest(new { title = "Invalid invitationId." });
        }

        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == invitationId, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }

        // An already-approved invitation (its id is now handed out freely as
        // the public share link) never needs another order — editing one no
        // longer routes back through checkout (see StudioWizard's
        // isAlreadyApproved). Blocking this closes off the only real use a
        // stranger could make of someone else's public link here: spamming
        // pending orders — and, if a promo code is attached, inflating a
        // partner's usage count — against an invitation they don't own.
        if (invitation.Status is "paid" or "shared")
        {
            return Conflict(new { title = "This invitation has already been approved." });
        }

        var pricing = await db.PricingSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (pricing is null)
        {
            return Problem("Pricing is not configured yet.", statusCode: 500);
        }

        Partner? matchedPartner = null;
        var basePrice = pricing.BasePriceUsd;
        var promoCode = request.PromoCode?.Trim();

        if (!string.IsNullOrEmpty(promoCode))
        {
            if (string.Equals(promoCode, pricing.PlatformDiscountCode, StringComparison.OrdinalIgnoreCase))
            {
                basePrice = ApplyDiscount(basePrice, pricing.PlatformDiscountType, pricing.PlatformDiscountValue);
            }
            else
            {
                matchedPartner = await db.Partners.FirstOrDefaultAsync(
                    p => p.Status == "approved" && p.Active && p.PromoCode != null && p.PromoCode.ToLower() == promoCode.ToLower(),
                    cancellationToken);
                if (matchedPartner is not null)
                {
                    var discountType = matchedPartner.DiscountType ?? pricing.DefaultPartnerDiscountType;
                    var discountValue = matchedPartner.DiscountValue ?? pricing.DefaultPartnerDiscountValue;
                    basePrice = ApplyDiscount(basePrice, discountType, discountValue);
                }
            }
        }

        var qrPrice = request.EnableQrEntry && request.QrGuestCount is > 0
            ? request.QrGuestCount.Value * pricing.QrRateUsd
            : 0m;
        var giftFee = request.EnableGifts && request.GiftFeeCoverage ? basePrice * (pricing.GiftFeePercent / 100m) : 0m;
        var amountUsd = basePrice + qrPrice + giftFee;

        var order = new Order
        {
            Id = Guid.NewGuid(),
            InvitationId = invitation.Id,
            CustomerName = request.CustomerName,
            CustomerEmail = request.CustomerEmail,
            QrEnabled = request.EnableQrEntry,
            QrGuestCount = request.QrGuestCount,
            GiftFeeCoverage = request.GiftFeeCoverage,
            PromoCodeUsed = matchedPartner is not null
                ? matchedPartner.PromoCode
                : (string.Equals(promoCode, pricing.PlatformDiscountCode, StringComparison.OrdinalIgnoreCase) ? promoCode : null),
            Country = string.IsNullOrWhiteSpace(request.Country) ? null : request.Country.Trim().ToUpperInvariant(),
            AmountUsd = amountUsd,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency,
            ConvertedAmount = request.ConvertedAmount,
            PaymentStatus = "pending",
            CreatedAt = DateTime.UtcNow,
        };

        db.Orders.Add(order);

        // Partner UsageCount/RevenueUsd are credited when the admin actually
        // confirms the bank transfer (UpdateStatus, below), not here — this
        // order is still just "pending" and may never be paid, and crediting
        // it now would overstate a partner's commission for checkouts that
        // never close.
        await db.SaveChangesAsync(cancellationToken);

        var resolvedAccount = await PaymentSettingsController.ResolveForCountryAsync(db, order.Country, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, new OrderCreatedResponse
        {
            Order = await ToDtoAsync(order, cancellationToken),
            PaymentSettings = resolvedAccount ?? new PaymentAccountDto(),
        });
    }

    // GET /api/orders/promo-code/{code} — anonymous, checkout's "تحقق"
    // button. Checks both the single platform-wide code and per-partner
    // codes (an approved, active Partner's own PromoCode) — the same two
    // sources Create resolves a promo against above — so the shopper gets a
    // real yes/no answer here instead of Create being the only place either
    // kind of code is actually validated. Read-only: never touches
    // Partner.UsageCount, which still only increments once an order backed
    // by this code is actually confirmed paid (see UpdateStatus).
    [HttpGet("promo-code/{code}")]
    public async Task<ActionResult<PromoCodeCheckDto>> CheckPromoCode(string code, CancellationToken cancellationToken)
    {
        var trimmed = code.Trim();
        if (trimmed.Length == 0)
        {
            return Ok(new PromoCodeCheckDto { Valid = false });
        }

        var pricing = await db.PricingSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (pricing is not null && string.Equals(trimmed, pricing.PlatformDiscountCode, StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new PromoCodeCheckDto
            {
                Valid = true,
                DiscountType = pricing.PlatformDiscountType,
                DiscountValue = pricing.PlatformDiscountValue,
            });
        }

        var partner = await db.Partners.AsNoTracking().FirstOrDefaultAsync(
            p => p.Status == "approved" && p.Active && p.PromoCode != null && p.PromoCode.ToLower() == trimmed.ToLower(),
            cancellationToken);
        if (partner is not null)
        {
            return Ok(new PromoCodeCheckDto
            {
                Valid = true,
                DiscountType = partner.DiscountType ?? pricing?.DefaultPartnerDiscountType ?? "percent",
                DiscountValue = partner.DiscountValue ?? pricing?.DefaultPartnerDiscountValue ?? 0m,
            });
        }

        return Ok(new PromoCodeCheckDto { Valid = false });
    }

    // GET /api/orders/{id} — anonymous: the id is an unguessable Guid, same
    // public-by-id precedent as InvitationsController.GetById, so a customer
    // can revisit their confirmation/status page after checkout.
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        var dto = await ToDtoAsync(order, cancellationToken);
        if (!User.IsInRole(Roles.Admin))
        {
            // AdminNote is the admin's own internal remark left when
            // reconciling the bank transfer — not something a customer
            // revisiting their own confirmation link should see.
            dto.AdminNote = null;
        }

        return Ok(dto);
    }

    // GET /api/orders — admin only; powers /admin/orders and the Overview
    // dashboard's KPIs/charts/recent-orders table. `status` matches the
    // page's status tabs (omit/"all" for every status). `search` matches
    // against CustomerName/CustomerEmail/PromoCodeUsed (all indexed — see
    // NumindsDbContext) so it stays fast as the table grows; paginated since
    // orders accumulate indefinitely and were previously fetched in full on
    // every page load.
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PagedResult<OrderDto>>> List(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Orders.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(o => o.PaymentStatus == status);
        }

        var term = search?.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            query = query.Where(o =>
                o.CustomerName.Contains(term) ||
                o.CustomerEmail.Contains(term) ||
                (o.PromoCodeUsed != null && o.PromoCodeUsed.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var invitationIds = orders.Where(o => o.InvitationId.HasValue).Select(o => o.InvitationId!.Value).Distinct().ToList();
        var invitations = await db.Invitations
            .AsNoTracking()
            .Where(i => invitationIds.Contains(i.Id))
            .Include(i => i.Template)
            .ToDictionaryAsync(i => i.Id, cancellationToken);

        return Ok(new PagedResult<OrderDto>
        {
            Items = orders.Select(o => ToDto(o, o.InvitationId is { } id ? invitations.GetValueOrDefault(id) : null)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        });
    }

    // DELETE /api/orders/{id} — admin cleanup for stale/duplicate/test
    // orders. Does not touch the linked Invitation (its Status stays
    // whatever it already was — deleting the order record itself isn't the
    // same as un-paying an invitation).
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        db.Orders.Remove(order);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    // POST /api/orders/{id}/send-reminder — admin nudges a customer whose
    // order is still "pending" (they started checkout but the admin never
    // received/confirmed a bank transfer) to go finish it. Pending-only:
    // reminding someone about an order that's already paid or failed makes
    // no sense and would just confuse them.
    [HttpPost("{id:guid}/send-reminder")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<OrderDto>> SendReminder(Guid id, CancellationToken cancellationToken)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        if (order.PaymentStatus != "pending")
        {
            return BadRequest(new { title = "Only a pending order can get a reminder." });
        }

        await emailSender.SendAsync(
            order.CustomerEmail,
            "أكمل طلبك على زيتورا",
            $"<p>مرحباً {order.CustomerName}،</p>" +
            "<p>لاحظنا إنه طلبك على زيتورا لسا قيد الانتظار. سجّل دخولك للوحة التحكم لمتابعة حالة طلبك وإتمام عملية الدفع.</p>" +
            $"<p><a href=\"{FrontendBaseUrl}/dashboard\">{FrontendBaseUrl}/dashboard</a></p>" +
            "<p>إذا كنت أتممت التحويل البنكي فعلاً، تجاهل هذه الرسالة — فريقنا بيراجعه قريباً.</p>",
            cancellationToken);

        order.ReminderSentAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Ok(await ToDtoAsync(order, cancellationToken));
    }

    // PATCH /api/orders/{id}/status — admin manually confirms (or rejects)
    // the out-of-band bank transfer they received. This is the approval
    // step for the linked Invitation too, not just the Order: marking
    // "paid" flips it to Status "paid" (visible in the owner's dashboard,
    // openable via its public link — see InvitationsController.
    // IsPubliclyVisible); marking "failed" flips it to "rejected", which
    // that same gate treats as not existing anywhere except to its owner
    // and admins. The Invitation row itself is never deleted here — an
    // admin correcting a mis-click just needs to mark it "paid" afterward
    // and everything unlocks again, rather than the guest's work being
    // gone for good.
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<OrderDto>> UpdateStatus(
        Guid id,
        UpdateOrderStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Status is not ("paid" or "failed"))
        {
            return BadRequest(new { title = "Status must be 'paid' or 'failed'." });
        }

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        var wasPaid = order.PaymentStatus == "paid";
        order.PaymentStatus = request.Status;
        order.AdminNote = string.IsNullOrWhiteSpace(request.AdminNote) ? null : request.AdminNote;

        if (request.Status == "paid")
        {
            order.PaidAt = DateTime.UtcNow;
        }

        // An invitation can end up with more than one Order — most often a
        // guest editing an already-approved invitation and (before that was
        // fixed) getting routed through checkout again, or an admin's own
        // duplicate/stale test order. Computed once, up front, since every
        // block below needs it: crediting a partner or reporting a Purchase
        // to Meta must not double up if a different order for the same
        // invitation is already paid, and rejecting *this* order must not
        // undo an approval (or a partner's earned credit) that already
        // happened through that other, still-paid order.
        var hasOtherPaidOrder = await db.Orders.AnyAsync(
            o => o.InvitationId == order.InvitationId && o.Id != order.Id && o.PaymentStatus == "paid",
            cancellationToken);

        // Credit (or reverse) the referring partner's stats only on an
        // actual paid/not-paid transition — not on every PATCH, so an admin
        // re-confirming an already-paid order (or re-rejecting an
        // already-failed one) can't inflate the numbers, and correcting a
        // mis-click (paid -> failed, or back) keeps them accurate either
        // way. Also skipped whenever hasOtherPaidOrder is true: crediting
        // would double-count a sale already credited through the other paid
        // order, and reversing would claw back credit that other order is
        // still legitimately earning.
        if (!string.IsNullOrEmpty(order.PromoCodeUsed) && wasPaid != (request.Status == "paid") && !hasOtherPaidOrder)
        {
            var partner = await db.Partners.FirstOrDefaultAsync(
                p => p.PromoCode != null && p.PromoCode.ToLower() == order.PromoCodeUsed.ToLower(),
                cancellationToken);
            if (partner is not null)
            {
                if (request.Status == "paid")
                {
                    partner.UsageCount += 1;
                    partner.RevenueUsd += order.AmountUsd;
                }
                else
                {
                    partner.UsageCount = Math.Max(0, partner.UsageCount - 1);
                    partner.RevenueUsd = Math.Max(0, partner.RevenueUsd - order.AmountUsd);
                }
            }
        }

        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == order.InvitationId, cancellationToken);
        if (invitation is not null)
        {
            if (request.Status == "paid")
            {
                invitation.Status = "paid";
            }
            else if (!hasOtherPaidOrder)
            {
                invitation.Status = "rejected";
            }
            invitation.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        // Only on the actual pending/failed -> paid transition, and only
        // when no other order for this invitation was already paid --
        // matches the partner-stats guard above, so an admin re-saving an
        // already-paid order (no-op re-confirmation, or just editing the
        // AdminNote) or confirming a stale duplicate order for an
        // invitation that's genuinely already been paid for can't
        // double-report the same sale to Meta.
        if (!wasPaid && request.Status == "paid" && !hasOtherPaidOrder)
        {
            // No real page URL exists for this event -- it fires from the
            // admin's confirmation click, not a customer browser session
            // (see SendPurchaseAsync's own doc comment). The dashboard is
            // the closest stable, real page on the site to attribute it to.
            await metaConversions.SendPurchaseAsync(
                order.Id.ToString(), order.CustomerEmail, order.AmountUsd, $"{FrontendBaseUrl}/dashboard", cancellationToken);
        }

        return Ok(await ToDtoAsync(order, cancellationToken));
    }

    private static decimal ApplyDiscount(decimal amount, string type, decimal value) =>
        type == "fixed" ? Math.Max(0, amount - value) : Math.Max(0, amount * (1 - value / 100m));

    private async Task<OrderDto> ToDtoAsync(Order order, CancellationToken cancellationToken)
    {
        var invitation = await db.Invitations.AsNoTracking()
            .Include(i => i.Template)
            .FirstOrDefaultAsync(i => i.Id == order.InvitationId, cancellationToken);
        return ToDto(order, invitation);
    }

    private static OrderDto ToDto(Order order, Invitation? invitation) => new()
    {
        Id = order.Id.ToString(),
        InvitationId = order.InvitationId?.ToString() ?? string.Empty,
        CustomerName = order.CustomerName,
        CustomerEmail = order.CustomerEmail,
        QrEnabled = order.QrEnabled,
        QrGuestCount = order.QrGuestCount,
        GiftFeeCoverage = order.GiftFeeCoverage,
        PromoCodeUsed = order.PromoCodeUsed,
        Country = order.Country,
        AmountUsd = order.AmountUsd,
        Currency = order.Currency,
        ConvertedAmount = order.ConvertedAmount,
        PaymentStatus = order.PaymentStatus,
        AdminNote = order.AdminNote,
        CreatedAt = order.CreatedAt,
        PaidAt = order.PaidAt,
        ReminderSentAt = order.ReminderSentAt,
        InvitationEditUrl = invitation is not null ? $"/invitationpublic?id={invitation.Id}&preview=true" : null,
        TemplateCode = invitation?.Template?.Code,
    };
}
