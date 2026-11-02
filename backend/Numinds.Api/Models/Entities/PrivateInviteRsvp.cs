namespace Numinds.Api.Models.Entities;

// One guest's answer to a private invitation whose RSVP is collected on the site (not through WhatsApp).
public class PrivateInviteRsvp
{
    public Guid Id { get; set; }
    public Guid PrivateInviteId { get; set; }
    public PrivateInvite? PrivateInvite { get; set; }

    public string GuestName { get; set; } = string.Empty;
    public bool? Attending { get; set; }
    public int? GuestCount { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
}
