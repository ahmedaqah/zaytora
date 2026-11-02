using System.Text.Json;

namespace Numinds.Api.Models.Dtos;

public class PrivateInviteDto
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public JsonElement Config { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Filled for admins only (GET /api/private-invites): e-mail of the customer account it was handed to, if any.
    public string? OwnerEmail { get; set; }
}

public class PrivateInviteWriteRequest
{
    public string Title { get; set; } = string.Empty;
    public JsonElement Config { get; set; }
}

public class PrivateInviteMediaUploadResponse
{
    public string Url { get; set; } = string.Empty;
}

// POST /api/private-invites/{slug}/transfer-link
public class PrivateInviteTransferLinkDto
{
    public string Url { get; set; } = string.Empty;
}

// POST /api/private-invites/claim-transfer
public class ClaimPrivateInviteRequest
{
    public string Token { get; set; } = string.Empty;
}

public class ClaimPrivateInviteResponse
{
    public string Slug { get; set; } = string.Empty;
}

// POST /api/private-invites/{slug}/rsvp (a guest, from the invitation page)
public class PrivateInviteRsvpRequest
{
    public string GuestName { get; set; } = string.Empty;
    public bool? Attending { get; set; }
    public int? GuestCount { get; set; }
    public string? Message { get; set; }
}

public class PrivateInviteRsvpDto
{
    public string Id { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public bool? Attending { get; set; }
    public int? GuestCount { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
}

// GET /api/private-invites/{slug}/wishes (public): only names and messages, never counts or attendance.
public class PrivateInviteWishDto
{
    public string GuestName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

// GET /api/private-invites/mine: a read-only card on the customer's dashboard.
public class OwnedPrivateInviteDto
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Name1 { get; set; }
    public string? Name2 { get; set; }
    public string? DateText { get; set; }
    public string? EventStart { get; set; }
    public bool SiteRsvp { get; set; }
    public bool ShowWishes { get; set; }
    public int ResponsesCount { get; set; }
    public int AttendingCount { get; set; }
    public int DeclinedCount { get; set; }
    public DateTime UpdatedAt { get; set; }
}
