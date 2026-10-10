using System.Text.Json;

namespace Numinds.Api.Models.Dtos;

public class PrivateInviteDto
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public JsonElement Config { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
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
