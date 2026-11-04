using System.Collections.Concurrent;

namespace Numinds.Api.Services;

// Pushes short admin notifications (new order, message, partner application, guest reply) to the owner's Telegram chat,
// which lands as a normal iPhone notification. Configure Telegram:BotToken and Telegram:ChatId; while either is empty
// every call is a silent no-op. Sending is fire-and-forget with its own short timeout and never throws, so a Telegram
// outage can never slow down or fail the order, message or reply that triggered it.
public interface IAdminNotifier
{
    void Notify(string text);

    // Guest replies come in bursts: the first one for an invitation is sent at once, the rest within the next
    // 30 minutes are collected into a single "N new replies" message.
    void NotifyReply(string key, string label, string firstLine);
}

public sealed class TelegramNotifier(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<TelegramNotifier> logger) : IAdminNotifier
{
    private static readonly TimeSpan ReplyWindow = TimeSpan.FromMinutes(30);

    private readonly ConcurrentDictionary<string, ReplyState> replies = new();

    private sealed class ReplyState
    {
        public readonly object Gate = new();
        public DateTime LastSent = DateTime.MinValue;
        public int Pending;
        public bool Scheduled;
    }

    private bool IsConfigured =>
        !string.IsNullOrWhiteSpace(configuration["Telegram:BotToken"]) &&
        !string.IsNullOrWhiteSpace(configuration["Telegram:ChatId"]);

    public void Notify(string text)
    {
        if (!IsConfigured) return;
        _ = SendAsync(text);
    }

    public void NotifyReply(string key, string label, string firstLine)
    {
        if (!IsConfigured) return;

        var state = replies.GetOrAdd(key, _ => new ReplyState());
        var sendNow = false;
        TimeSpan? flushIn = null;
        lock (state.Gate)
        {
            var now = DateTime.UtcNow;
            if (now - state.LastSent >= ReplyWindow)
            {
                state.LastSent = now;
                sendNow = true;
            }
            else
            {
                state.Pending++;
                if (!state.Scheduled)
                {
                    state.Scheduled = true;
                    flushIn = state.LastSent + ReplyWindow - now;
                }
            }
        }

        var safeLabel = Clean(label, 80);
        if (sendNow)
        {
            Notify($"💌 رد جديد على «{safeLabel}»\n{Clean(firstLine, 200)}");
        }
        if (flushIn is { } delay)
        {
            _ = FlushLaterAsync(state, safeLabel, delay);
        }
    }

    private async Task FlushLaterAsync(ReplyState state, string label, TimeSpan delay)
    {
        try
        {
            await Task.Delay(delay < TimeSpan.Zero ? TimeSpan.Zero : delay);
        }
        catch
        {
            return;
        }

        int count;
        lock (state.Gate)
        {
            count = state.Pending;
            state.Pending = 0;
            state.Scheduled = false;
            if (count > 0) state.LastSent = DateTime.UtcNow;
        }
        if (count > 0)
        {
            Notify($"💌 {count} ردود جديدة على «{label}»");
        }
    }

    private async Task SendAsync(string text)
    {
        try
        {
            var token = configuration["Telegram:BotToken"];
            var chatId = configuration["Telegram:ChatId"];
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(chatId)) return;

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
            using var http = httpClientFactory.CreateClient();
            var response = await http.PostAsJsonAsync(
                $"https://api.telegram.org/bot{token}/sendMessage",
                new { chat_id = chatId, text = Clean(text, 1000), disable_web_page_preview = true },
                cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Telegram notification failed with status {Status}", (int)response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            // Never log ex.Message / the request URL: it would contain the bot token.
            logger.LogWarning("Telegram notification failed ({Type})", ex.GetType().Name);
        }
    }

    // Plain text only (no parse mode, so nothing a guest typed can break the message); no line-break floods.
    private static string Clean(string? value, int max)
    {
        var text = (value ?? string.Empty).Trim();
        return text.Length > max ? text[..max] + "…" : text;
    }
}
