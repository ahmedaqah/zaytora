namespace Numinds.Api.Models.Dtos;

// Row shape for GET /api/invitations — the dashboard's bookings table.
// Deliberately thin compared to InvitationDetailDto: the list view only
// needs enough to render a table row, not the full wizard state.
public class InvitationSummaryDto
{
    public string Id { get; set; } = string.Empty;
    // Friendly display code (e.g. "ND1001") — derived from the caller's
    // invitations ordered by creation date, not a stored column.
    public string BookingId { get; set; } = string.Empty;
    // Powers the dashboard's "copy link" button (GET /i/{code} short link) —
    // see InvitationsController.ShareRedirect.
    public string ShareCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsPaid { get; set; }
    // True when an Order for this invitation is still awaiting the admin's
    // manual bank-transfer confirmation -- lets the dashboard warn before a
    // delete that would silently orphan that order (see
    // InvitationsController.Delete/OrdersController.UpdateStatus).
    public bool HasPendingOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? EventDateTime { get; set; }
    public int ResponseCount { get; set; }
    public int GalleryCount { get; set; }
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
}

// GET /api/invitations/{id}/rsvp — one row per guest RSVP submission, for
// the owner's dashboard "Responses" modal (not the guest-facing wishes
// feed, which only surfaces the Message text).
public class RsvpResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public bool? Attending { get; set; }
    public int? GuestCount { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
}

// GET /api/invitations/{id}/captured-photos — one row per guest photo taken
// with the invitation's built-in camera (CameraOverlay.tsx), for the owner's
// dashboard "Captured" tab (GalleryModal.tsx).
public class CapturedPhotoDto
{
    public string Id { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CapturedPhotosPageDto
{
    public List<CapturedPhotoDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
}
