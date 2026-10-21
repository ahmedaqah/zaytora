namespace Numinds.Api.Models.Entities;

// One check-in link the invitation's owner hands to a door person ("scanner",
// e.g. "Gate 1"). The random Token in the link is the only credential the
// scanner page needs -- no account -- and revoking sets RevokedAt so a link
// that leaks can be shut off without touching the check-in history.
public class QrScanner
{
    public Guid Id { get; set; }
    public Guid InvitationId { get; set; }
    public Invitation? Invitation { get; set; }

    public string Label { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
