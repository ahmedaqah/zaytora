namespace Numinds.Api.Models.Dtos;

public class QrScannerDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

public class QrCheckinDto
{
    public string Id { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public int PartySize { get; set; }
    public string ScannerLabel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

// The owner's dashboard view of the QR guest-entry feature: scanner links
// plus every confirmed arrival, oldest first.
public class QrEntryStateDto
{
    public bool Enabled { get; set; }
    public int? GuestCount { get; set; }
    public int ScannerLimit { get; set; }
    public DateTime? ScanStart { get; set; }
    public DateTime? ScanEnd { get; set; }
    public string? ShareCode { get; set; }
    public int TotalPeople { get; set; }
    public List<QrScannerDto> Scanners { get; set; } = [];
    public List<QrCheckinDto> Checkins { get; set; } = [];
}

public class CreateQrScannerRequest
{
    public string? Label { get; set; }
}

// What the public scanner page needs to render itself: nothing about the
// guest list, only the event's name, the scan window and the running count.
public class QrScanInfoDto
{
    public string Names { get; set; } = string.Empty;
    public string ScannerLabel { get; set; } = string.Empty;
    public string? ShareCode { get; set; }
    public int? GuestCount { get; set; }
    public int TotalPeople { get; set; }
    public DateTime? ScanStart { get; set; }
    public DateTime? ScanEnd { get; set; }
    // null = no window configured (or it couldn't be evaluated).
    public bool? WindowOpen { get; set; }
}

public class QrCheckinRequest
{
    public string? GuestName { get; set; }
    public int? PartySize { get; set; }
    // The share code read from the scanned QR (the last path segment of the
    // invitation link it encodes).
    public string? ShareCode { get; set; }
    // false on the first attempt; the scanner page re-sends with true after
    // the door person has seen the warnings and decided to let the guest in.
    public bool Confirm { get; set; }
}

public class QrCheckinResultDto
{
    public bool Recorded { get; set; }
    // "duplicate" | "over_capacity" | "outside_window"
    public List<string> Warnings { get; set; } = [];
    public int TotalPeople { get; set; }
    public QrCheckinDto? Checkin { get; set; }
}
