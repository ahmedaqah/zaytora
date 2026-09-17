using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;

namespace Numinds.Api.Controllers;

// Reserved CountryCode that's always shown to a paying customer whenever
// their chosen country has no override of its own configured below.
public static class PaymentAccountCountryCodes
{
    public const string International = "INTL";
}

// Admin-only in both directions — unlike ContactSettings this isn't shown on
// any public page. A paying customer sees the one account resolved for
// their chosen country embedded directly in the POST /api/orders response
// instead (see OrdersController.Create -> ResolveForCountryAsync below),
// not via a standalone public GET here.
[ApiController]
[Route("api/payment-settings")]
[Authorize(Roles = Roles.Admin)]
public class PaymentSettingsController(NumindsDbContext db) : ControllerBase
{
    // GET /api/payment-settings — every country the admin has configured an
    // account for, plus the always-present "INTL" fallback (once it's been
    // saved at least once). A country not in this list simply has no
    // override yet; the frontend's own country picker knows the full list
    // of selectable countries independently of what's configured here.
    [HttpGet]
    public async Task<ActionResult<List<PaymentAccountDto>>> GetAll(CancellationToken cancellationToken)
    {
        var accounts = await db.PaymentAccounts.AsNoTracking().ToListAsync(cancellationToken);
        return Ok(accounts.Select(ToDto).ToList());
    }

    // PUT /api/payment-settings/{countryCode} — creates or replaces the
    // account shown to customers who pick this country (or the "INTL"
    // fallback, for the reserved code above).
    [HttpPut("{countryCode}")]
    public async Task<ActionResult<PaymentAccountDto>> Upsert(
        string countryCode,
        PaymentAccountWriteRequest request,
        CancellationToken cancellationToken)
    {
        var normalized = NormalizeCode(countryCode);
        var account = await db.PaymentAccounts.FirstOrDefaultAsync(a => a.CountryCode == normalized, cancellationToken);
        if (account is null)
        {
            account = new PaymentAccount { Id = Guid.NewGuid(), CountryCode = normalized };
            db.PaymentAccounts.Add(account);
        }

        account.RecipientName = request.RecipientName;
        account.AccountNumber = request.AccountNumber;
        account.BankName = string.IsNullOrWhiteSpace(request.BankName) ? null : request.BankName;
        account.Iban = string.IsNullOrWhiteSpace(request.Iban) ? null : request.Iban;
        account.Instructions = string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions;

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(account));
    }

    // DELETE /api/payment-settings/{countryCode} — removes a country's own
    // override so it falls back to "INTL" again. The fallback row itself
    // can never be deleted this way, only edited via PUT.
    [HttpDelete("{countryCode}")]
    public async Task<IActionResult> Delete(string countryCode, CancellationToken cancellationToken)
    {
        var normalized = NormalizeCode(countryCode);
        if (normalized == PaymentAccountCountryCodes.International)
        {
            return BadRequest(new { title = "The international fallback account can't be removed, only edited." });
        }

        var account = await db.PaymentAccounts.FirstOrDefaultAsync(a => a.CountryCode == normalized, cancellationToken);
        if (account is null)
        {
            return NotFound();
        }

        db.PaymentAccounts.Remove(account);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static string NormalizeCode(string countryCode) => countryCode.Trim().ToUpperInvariant();

    internal static PaymentAccountDto ToDto(PaymentAccount a) => new()
    {
        CountryCode = a.CountryCode,
        RecipientName = a.RecipientName,
        AccountNumber = a.AccountNumber,
        BankName = a.BankName,
        Iban = a.Iban,
        Instructions = a.Instructions,
    };

    // Used by OrdersController to pick which account a paying customer sees
    // for the country they chose at checkout — their own country's account
    // if the admin configured one, otherwise the "INTL" fallback, otherwise
    // null (mirrors today's "not configured yet" empty state on the
    // confirmation screen when even INTL hasn't been filled in).
    internal static async Task<PaymentAccountDto?> ResolveForCountryAsync(
        NumindsDbContext db,
        string? countryCode,
        CancellationToken cancellationToken)
    {
        var normalized = string.IsNullOrWhiteSpace(countryCode) ? null : NormalizeCode(countryCode);
        PaymentAccount? account = null;
        if (normalized is not null)
        {
            account = await db.PaymentAccounts.AsNoTracking()
                .FirstOrDefaultAsync(a => a.CountryCode == normalized, cancellationToken);
        }

        account ??= await db.PaymentAccounts.AsNoTracking()
            .FirstOrDefaultAsync(a => a.CountryCode == PaymentAccountCountryCodes.International, cancellationToken);

        return account is null ? null : ToDto(account);
    }
}
