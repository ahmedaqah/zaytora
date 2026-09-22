namespace Numinds.Api.Models.Dtos;

// Mirrors src/types/api.ts -> UserDto
public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    // Backed by IdentityUser's built-in PhoneNumber column — no new migration needed.
    public string? PhoneNumber { get; set; }
    // True when the user is in the "Admin" IdentityRole — gates /admin on the frontend.
    public bool IsAdmin { get; set; }
    // Sequential position (1, 2, 3...) among non-admin users ordered by
    // CreatedAt ascending -- only meaningful on GET /api/users (the admin
    // list); null everywhere else (account/me, register, login), and null
    // for admins there too, since they're pinned to the top unnumbered.
    public int? JoinNumber { get; set; }

    // How far this account actually got, derived from their own
    // Invitations/Orders rather than stored anywhere -- lets an admin tell
    // a real drop-off apart from someone who simply registered and never
    // came back. "signed_up" (no invitation yet) -> "created_invitation"
    // (built one, never reached checkout) -> "reached_checkout" (has an
    // Order, any status) -> "paid" (at least one Order is "paid"). Only
    // populated on GET /api/users; null everywhere else.
    public string? FunnelStage { get; set; }
    public int? InvitationCount { get; set; }
    // Latest of this user's own Invitation.UpdatedAt / Order.CreatedAt --
    // the most recent thing they're known to have done on the site.
    public DateTime? LastActivityAt { get; set; }

    // When UsersController.SendEngagementEmails last emailed this account to
    // ask why they never ordered -- null if they've never been contacted.
    public DateTime? EngagementEmailSentAt { get; set; }
}

// PATCH /api/users/{id}/role — Role is "Admin" to promote, or null/omitted
// to demote back to a regular user. Only one role currently exists
// (Models.Roles.Admin), so this is a binary toggle rather than a free-text
// role assignment.
public class ChangeUserRoleRequest
{
    public string? Role { get; set; }
}

// POST /api/users/send-engagement-emails — response summarizing a bulk send.
public class SendEngagementEmailsResult
{
    public int SentCount { get; set; }
}
