namespace Numinds.Api.Models.Entities;

// One arrival a scanner confirmed at the door: just the name they typed and
// how many people it covers. ScannerLabel is a snapshot of the scanner's
// label at that moment, so the history stays readable even after the
// scanner link is revoked.
public class QrCheckin
{
    public Guid Id { get; set; }
    public Guid InvitationId { get; set; }
    public Invitation? Invitation { get; set; }

    public Guid? ScannerId { get; set; }
    public string ScannerLabel { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public int PartySize { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
}
