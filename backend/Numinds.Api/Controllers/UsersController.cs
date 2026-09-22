using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;

namespace Numinds.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = Roles.Admin)]
public class UsersController(
    NumindsDbContext db,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager) : ControllerBase
{
    // GET /api/users — admin, for a new /admin/users page. `search` matches
    // DisplayName/Email. Sort order: every admin first (pinned to the top,
    // unnumbered on the frontend), then everyone else oldest-to-newest by
    // CreatedAt -- JoinNumber is their 1-based rank among non-admins only,
    // computed over the *entire* user base regardless of the current
    // search/page, so a given account's number never shifts as someone
    // else is promoted/demoted or a different page/search is viewed.
    //
    // Loaded fully into memory rather than paginated in SQL: the whole
    // point is a rank that's stable across pages, which a purely
    // SQL-paginated query can't produce without a second full-table pass
    // anyway. A wedding-invitation site's user base is nowhere near the
    // size where that's a real cost -- the admin-only templates/partners
    // lists elsewhere in this app already load in full the same way.
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var adminIds = (await userManager.GetUsersInRoleAsync(Roles.Admin))
            .Select(u => u.Id)
            .ToHashSet();

        var allUsers = await db.Users.AsNoTracking().ToListAsync(cancellationToken);

        // Funnel data: how far each account actually got. Invitation.UserId
        // is the only link back to a user (Order only points at an
        // Invitation), so orders are attributed to a user by way of the
        // invitation they were placed against.
        var invitations = await db.Invitations.AsNoTracking()
            .Where(i => i.UserId != null)
            .Select(i => new { i.Id, UserId = i.UserId!.Value, i.UpdatedAt })
            .ToListAsync(cancellationToken);
        var invitationIdToUserId = invitations.ToDictionary(i => i.Id, i => i.UserId);
        var invitationCountByUserId = invitations
            .GroupBy(i => i.UserId)
            .ToDictionary(g => g.Key, g => g.Count());
        var lastInvitationActivityByUserId = invitations
            .GroupBy(i => i.UserId)
            .ToDictionary(g => g.Key, g => g.Max(i => i.UpdatedAt));

        var relevantInvitationIds = invitationIdToUserId.Keys.ToList();
        var orders = relevantInvitationIds.Count == 0
            ? []
            : await db.Orders.AsNoTracking()
                .Where(o => o.InvitationId != null && relevantInvitationIds.Contains(o.InvitationId.Value))
                .Select(o => new { InvitationId = o.InvitationId!.Value, o.PaymentStatus, o.CreatedAt })
                .ToListAsync(cancellationToken);
        var ordersByUserId = orders
            .GroupBy(o => invitationIdToUserId[o.InvitationId])
            .ToDictionary(g => g.Key, g => g.ToList());

        var joinNumberByUserId = allUsers
            .Where(u => !adminIds.Contains(u.Id))
            .OrderBy(u => u.CreatedAt)
            .Select((u, index) => (u.Id, Number: index + 1))
            .ToDictionary(x => x.Id, x => x.Number);

        var term = search?.Trim();
        var matching = string.IsNullOrEmpty(term)
            ? allUsers
            : allUsers.Where(u => u.DisplayName.Contains(term) || (u.Email != null && u.Email.Contains(term))).ToList();

        var ordered = matching
            .OrderByDescending(u => adminIds.Contains(u.Id))
            .ThenBy(u => u.CreatedAt)
            .ToList();

        var pageItems = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new PagedResult<UserDto>
        {
            Items = pageItems
                .Select(u =>
                {
                    var isAdmin = adminIds.Contains(u.Id);
                    // Dictionary<Guid, int>.GetValueOrDefault would silently
                    // return 0 (int's own default) for an admin, who was
                    // deliberately excluded when this map was built -- an
                    // explicit null here is what actually renders as "no
                    // number, pinned to the top" on the frontend, not a
                    // literal 0th place.
                    int? joinNumber = isAdmin ? null : joinNumberByUserId.GetValueOrDefault(u.Id);

                    var userOrders = ordersByUserId.GetValueOrDefault(u.Id);
                    var invitationCount = invitationCountByUserId.GetValueOrDefault(u.Id);
                    var funnelStage = userOrders is { Count: > 0 }
                        ? (userOrders.Any(o => o.PaymentStatus == "paid") ? "paid" : "reached_checkout")
                        : (invitationCount > 0 ? "created_invitation" : "signed_up");

                    DateTime? lastActivityAt = lastInvitationActivityByUserId.GetValueOrDefault(u.Id);
                    if (userOrders is { Count: > 0 })
                    {
                        var lastOrderAt = userOrders.Max(o => o.CreatedAt);
                        if (lastActivityAt is null || lastOrderAt > lastActivityAt) lastActivityAt = lastOrderAt;
                    }

                    return ToDto(u, isAdmin, joinNumber, funnelStage, invitationCount, lastActivityAt);
                })
                .ToList(),
            TotalCount = ordered.Count,
            Page = page,
            PageSize = pageSize,
        });
    }

    // DELETE /api/users/{id} — admin removes another account entirely.
    // Self-delete is refused here (same reasoning as the role-demote guard
    // below): use the account's own DELETE /api/account instead, which
    // signs the caller out cleanly rather than leaving an admin's session
    // pointing at a user that no longer exists mid-request. Invitations/
    // Orders this user owned aren't deleted -- see NumindsDbContext's
    // SetNull FK behavior, same as an invitation's own deletion orphaning
    // its Order rather than cascading.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var currentUserId = userManager.GetUserId(User);
        if (string.Equals(currentUserId, id.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { title = "You can't delete your own account from here." });
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            var title = string.Join(" ", result.Errors.Select(e => e.Description));
            return BadRequest(new { title });
        }

        return NoContent();
    }

    // PATCH /api/users/{id}/role — Role: "Admin" to promote, null to demote.
    // An admin can't demote themselves (would leave them locked out of
    // /admin mid-session with no other admin necessarily available to undo it).
    [HttpPatch("{id:guid}/role")]
    public async Task<ActionResult<UserDto>> ChangeRole(Guid id, ChangeUserRoleRequest request, CancellationToken cancellationToken)
    {
        if (request.Role is not (null or Roles.Admin))
        {
            return BadRequest(new { title = $"Unsupported role '{request.Role}'." });
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var currentUserId = userManager.GetUserId(User);
        if (request.Role is null && string.Equals(currentUserId, id.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { title = "You can't remove your own admin role." });
        }

        if (!await roleManager.RoleExistsAsync(Roles.Admin))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(Roles.Admin));
        }

        var isAdmin = await userManager.IsInRoleAsync(user, Roles.Admin);
        if (request.Role == Roles.Admin && !isAdmin)
        {
            await userManager.AddToRoleAsync(user, Roles.Admin);
            isAdmin = true;
        }
        else if (request.Role is null && isAdmin)
        {
            await userManager.RemoveFromRoleAsync(user, Roles.Admin);
            isAdmin = false;
        }

        // JoinNumber omitted (null) here -- an accurate one needs this
        // user's rank against the whole non-admin list, same computation
        // List() does over everyone. The frontend re-fetches the full list
        // right after a successful toggle instead of patching this one row
        // in place, so the correct number (or "pinned, unnumbered" for a
        // fresh admin) shows up within the same action either way.
        return Ok(ToDto(user, isAdmin, joinNumber: null));
    }

    private static UserDto ToDto(
        ApplicationUser u,
        bool isAdmin,
        int? joinNumber,
        string? funnelStage = null,
        int? invitationCount = null,
        DateTime? lastActivityAt = null) => new()
    {
        Id = u.Id.ToString(),
        DisplayName = u.DisplayName,
        Email = u.Email ?? string.Empty,
        AvatarUrl = u.AvatarUrl,
        PhoneNumber = u.PhoneNumber,
        IsAdmin = isAdmin,
        JoinNumber = joinNumber,
        FunnelStage = funnelStage,
        InvitationCount = invitationCount,
        LastActivityAt = lastActivityAt,
    };
}
