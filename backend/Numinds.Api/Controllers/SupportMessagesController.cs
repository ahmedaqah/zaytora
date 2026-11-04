using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;

namespace Numinds.Api.Controllers;

[ApiController]
[Route("api/support-messages")]
public class SupportMessagesController(NumindsDbContext db, Numinds.Api.Services.IAdminNotifier notifier, IConfiguration configuration) : ControllerBase
{
    // POST /api/support-messages — anonymous, public "Contact Us" form
    // (ContactUsView.tsx). Covered by Program.cs's global rate limiter like
    // every other public submission endpoint (reviews, partner applications).
    [HttpPost]
    public async Task<ActionResult<SupportMessageDto>> Submit(
        SupportMessageSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        var message = new SupportMessage
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            Subject = request.Subject,
            Message = request.Message,
            ReceivedAt = DateTime.UtcNow,
            IsRead = false,
        };

        db.SupportMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken);

        var siteBase = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        notifier.Notify($"✉️ رسالة جديدة من {message.Name}: {message.Subject}\n{siteBase}/admin/settings");

        return Ok(ToDto(message));
    }

    // GET /api/support-messages — admin inbox (/admin/settings).
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<List<SupportMessageDto>>> List(CancellationToken cancellationToken)
    {
        var messages = await db.SupportMessages
            .AsNoTracking()
            .OrderByDescending(m => m.ReceivedAt)
            .ToListAsync(cancellationToken);

        return Ok(messages.Select(ToDto).ToList());
    }

    [HttpPatch("{id:guid}/read")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<SupportMessageDto>> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        var message = await db.SupportMessages.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (message is null)
        {
            return NotFound();
        }

        message.IsRead = true;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(message));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var message = await db.SupportMessages.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (message is null)
        {
            return NotFound();
        }

        db.SupportMessages.Remove(message);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteAll(CancellationToken cancellationToken)
    {
        await db.SupportMessages.ExecuteDeleteAsync(cancellationToken);
        return NoContent();
    }

    private static SupportMessageDto ToDto(SupportMessage m) => new()
    {
        Id = m.Id.ToString(),
        Name = m.Name,
        Email = m.Email,
        Subject = m.Subject,
        Message = m.Message,
        ReceivedAt = m.ReceivedAt,
        Read = m.IsRead,
    };
}
