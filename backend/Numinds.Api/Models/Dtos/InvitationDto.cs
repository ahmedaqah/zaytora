namespace Numinds.Api.Models.Dtos;

// Mirrors src/types/api.ts -> InvitationDto
public class InvitationDto
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string EditUrl { get; set; } = string.Empty;
}

// POST /api/invitations/{id}/transfer-link — admin only.
public class InvitationTransferLinkDto
{
    public string Url { get; set; } = string.Empty;
}

// POST /api/invitations/claim-transfer
public class ClaimInvitationTransferRequest
{
    public string Token { get; set; } = string.Empty;
}

public class ClaimInvitationTransferResponse
{
    public string InvitationId { get; set; } = string.Empty;
}
