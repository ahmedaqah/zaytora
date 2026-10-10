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
}
