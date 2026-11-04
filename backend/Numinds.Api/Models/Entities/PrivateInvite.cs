namespace Numinds.Api.Models.Entities;

// Hand-built invitations created by an admin in /admin/invite-builder and served
// at /invites/p/<slug>. ConfigJson is the invitation's whole content (texts, dates,
// colours, media URLs) exactly as the shared template renderer reads it.
public class PrivateInvite
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ConfigJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Temporarily switched off by an admin: the public page shows a "paused" notice and takes no new answers.
    // Nothing else is touched, so switching it back on restores the invitation exactly as it was.
    public bool IsPaused { get; set; }

    // Customer account the invitation was handed over to (read-only for them: they share it, preview it and
    // follow the RSVPs, but only an admin can edit it). Null = still admin-only, exactly as before.
    public Guid? OwnerUserId { get; set; }
    public ApplicationUser? Owner { get; set; }

    // One-time hand-off link (same idea as Invitation.TransferToken); cleared as soon as it is redeemed.
    public string? TransferToken { get; set; }
    public DateTime? TransferTokenExpiresAt { get; set; }

    // Guest answers sent from the invitation page itself (config.rsvp.mode == "site").
    public List<PrivateInviteRsvp> Rsvps { get; set; } = [];
}
