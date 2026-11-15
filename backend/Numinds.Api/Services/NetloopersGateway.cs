using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Numinds.Api.Services;

// Card payments through Netloopers (https://netloopers.com/developers).
//
// Flow: OrdersController.PayByCard asks for a hosted-checkout session and
// redirects the customer to its checkout_url; once they pay, Netloopers calls
// OrdersController.NetloopersWebhook (HMAC-signed), which re-fetches the payment
// from Netloopers and only then approves the order. Nothing the browser sends
// back (the success_url redirect) is ever trusted as proof of payment.
//
// Configuration (secrets go in environment variables, never in the repo):
//   Netloopers:SecretKey       sk_test_... / sk_live_...     (required)
//   Netloopers:WebhookSecret   signing secret of the webhook (required for the webhook)
//   Netloopers:EnabledCountries comma list of order country codes allowed to pay by card, e.g. "NG"
//   Netloopers:CategorySlug    optional; sent as category_slug when the account has no default category
//   Netloopers:SuccessStatuses optional comma list of payment `status` values that mean "paid"
//   Netloopers:BaseUrl         optional, defaults to https://netloopers.com/api/v1
public interface INetloopersGateway
{
    // True when the key is configured AND the order's country is in EnabledCountries.
    bool IsAvailableForCountry(string? countryCode);

    Task<NetloopersCheckout> CreateCheckoutAsync(
        Guid orderId,
        decimal amountUsd,
        string customerName,
        string customerEmail,
        string description,
        string successUrl,
        string cancelUrl,
        CancellationToken cancellationToken);

    Task<NetloopersPayment> GetPaymentAsync(string paymentId, CancellationToken cancellationToken);

    // HMAC-SHA256 over "{timestamp}.{raw body}" with the webhook secret, hex digest,
    // constant-time compare, and a 300 s timestamp tolerance (Netloopers' documented scheme).
    bool VerifyWebhookSignature(string? timestampHeader, string? signatureHeader, byte[] rawBody);

    // True when `status` (as returned by GET /payments/{id}) means the money was received.
    bool IsSuccessStatus(string? status);

    // True while the payment is still in flight (not final): the webhook asks for a retry instead of giving up.
    bool IsPendingStatus(string? status);

    // The Netloopers environment ("test" / "live") this server's key belongs to.
    string ExpectedEnvironment { get; }
}

public sealed record NetloopersCheckout(string PaymentId, string CheckoutUrl);

public sealed record NetloopersPayment(
    string Id,
    string? Status,
    long Amount,
    string? Currency,
    string? OrderId,
    string? Environment);

public sealed class NetloopersGateway(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<NetloopersGateway> logger) : INetloopersGateway
{
    private static readonly TimeSpan WebhookTolerance = TimeSpan.FromSeconds(300);
    private static readonly string[] DefaultSuccessStatuses = ["completed", "paid", "succeeded", "success", "captured", "settled"];

    // One access token shared by every request on this server (it is short-lived, ~1 h).
    private static readonly SemaphoreSlim TokenGate = new(1, 1);
    private static string? cachedToken;
    private static DateTime cachedTokenExpiresUtc = DateTime.MinValue;

    private string SecretKey => configuration["Netloopers:SecretKey"] ?? string.Empty;
    private string WebhookSecret => configuration["Netloopers:WebhookSecret"] ?? string.Empty;
    private string BaseUrl => (configuration["Netloopers:BaseUrl"] ?? "https://netloopers.com/api/v1").TrimEnd('/');

    public string ExpectedEnvironment => SecretKey.StartsWith("sk_live_", StringComparison.Ordinal) ? "live" : "test";

    public bool IsAvailableForCountry(string? countryCode)
    {
        if (string.IsNullOrWhiteSpace(SecretKey) || string.IsNullOrWhiteSpace(countryCode))
        {
            return false;
        }

        var enabled = (configuration["Netloopers:EnabledCountries"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return enabled.Contains(countryCode.Trim(), StringComparer.OrdinalIgnoreCase);
    }

    public bool IsSuccessStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return false;
        }

        var configured = (configuration["Netloopers:SuccessStatuses"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var accepted = configured.Length > 0 ? configured : DefaultSuccessStatuses;
        return accepted.Contains(status.Trim(), StringComparer.OrdinalIgnoreCase);
    }

    public bool IsPendingStatus(string? status) =>
        !string.IsNullOrWhiteSpace(status) &&
        new[] { "pending", "processing", "initiated", "created", "in_progress", "requires_action" }
            .Contains(status.Trim(), StringComparer.OrdinalIgnoreCase);

    public async Task<NetloopersCheckout> CreateCheckoutAsync(
        Guid orderId,
        decimal amountUsd,
        string customerName,
        string customerEmail,
        string description,
        string successUrl,
        string cancelUrl,
        CancellationToken cancellationToken)
    {
        // "Amounts are integer minor units" (OpenAPI) -> USD cents.
        var cents = (long)Math.Round(amountUsd * 100m, MidpointRounding.AwayFromZero);

        var body = new Dictionary<string, object?>
        {
            ["amount"] = cents,
            ["currency"] = "USD",
            ["order_id"] = orderId.ToString(),
            ["description"] = description,
            ["customer"] = new Dictionary<string, string> { ["name"] = customerName, ["email"] = customerEmail },
            ["success_url"] = successUrl,
            ["cancel_url"] = cancelUrl,
            ["failed_url"] = cancelUrl,
            ["checkout"] = true,
        };
        var categorySlug = configuration["Netloopers:CategorySlug"];
        if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            body["category_slug"] = categorySlug;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/payments")
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await GetAccessTokenAsync(cancellationToken));
        // A fresh key per attempt: a customer who abandoned a checkout and tries again must get a new
        // payment, not a replay of the old one.
        request.Headers.Add("Idempotency-Key", $"order_{orderId:N}_{Guid.NewGuid().ToString("N")[..8]}");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Netloopers create payment failed for order {OrderId}: {Status} {Body}", orderId, (int)response.StatusCode, Truncate(json));
            throw new InvalidOperationException($"Netloopers returned {(int)response.StatusCode} when creating the payment.");
        }

        using var doc = JsonDocument.Parse(json);
        var root = Unwrap(doc.RootElement);
        var id = GetString(root, "id");
        var checkoutUrl = GetString(root, "checkout_url");
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(checkoutUrl))
        {
            logger.LogError("Netloopers create payment returned no id/checkout_url for order {OrderId}: {Body}", orderId, Truncate(json));
            throw new InvalidOperationException("Netloopers did not return a checkout URL.");
        }

        return new NetloopersCheckout(id, checkoutUrl);
    }

    public async Task<NetloopersPayment> GetPaymentAsync(string paymentId, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{BaseUrl}/payments/{Uri.EscapeDataString(paymentId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await GetAccessTokenAsync(cancellationToken));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Netloopers get payment {PaymentId} failed: {Status} {Body}", paymentId, (int)response.StatusCode, Truncate(json));
            throw new InvalidOperationException($"Netloopers returned {(int)response.StatusCode} when reading payment {paymentId}.");
        }

        using var doc = JsonDocument.Parse(json);
        var root = Unwrap(doc.RootElement);
        long amount = -1; // absent, fractional or unparseable: never matches an order total
        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("amount", out var amountEl))
        {
            if (amountEl.ValueKind == JsonValueKind.Number && amountEl.TryGetInt64(out var n))
            {
                amount = n;
            }
            else if (amountEl.ValueKind == JsonValueKind.String &&
                     long.TryParse(amountEl.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                amount = parsed;
            }
        }

        return new NetloopersPayment(
            GetString(root, "id") ?? paymentId,
            GetString(root, "status"),
            amount,
            GetString(root, "currency"),
            GetString(root, "order_id"),
            GetString(root, "environment"));
    }

    public bool VerifyWebhookSignature(string? timestampHeader, string? signatureHeader, byte[] rawBody)
    {
        if (string.IsNullOrEmpty(WebhookSecret) || string.IsNullOrWhiteSpace(timestampHeader) || string.IsNullOrWhiteSpace(signatureHeader))
        {
            return false;
        }

        if (!long.TryParse(timestampHeader.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var seconds))
        {
            return false;
        }

        // Reject absurd values up front: FromUnixTimeSeconds throws outside this range, and an
        // unauthenticated request must never be able to cause a 500.
        if (seconds < 0 || seconds > 253402300799)
        {
            return false;
        }

        var sentAt = DateTimeOffset.FromUnixTimeSeconds(seconds);
        if ((DateTimeOffset.UtcNow - sentAt).Duration() > WebhookTolerance)
        {
            return false;
        }

        // "{timestamp}.{raw_json_body}" -- the body bytes exactly as received.
        var prefix = Encoding.UTF8.GetBytes(timestampHeader.Trim() + ".");
        var signed = new byte[prefix.Length + rawBody.Length];
        Buffer.BlockCopy(prefix, 0, signed, 0, prefix.Length);
        Buffer.BlockCopy(rawBody, 0, signed, prefix.Length, rawBody.Length);

        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(WebhookSecret), signed);

        var provided = signatureHeader.Trim();
        if (provided.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
        {
            provided = provided["sha256=".Length..];
        }

        byte[] providedBytes;
        try
        {
            providedBytes = Convert.FromHexString(provided);
        }
        catch (FormatException)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expected, providedBytes);
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (cachedToken is not null && DateTime.UtcNow < cachedTokenExpiresUtc)
        {
            return cachedToken;
        }

        await TokenGate.WaitAsync(cancellationToken);
        try
        {
            if (cachedToken is not null && DateTime.UtcNow < cachedTokenExpiresUtc)
            {
                return cachedToken;
            }

            if (string.IsNullOrWhiteSpace(SecretKey))
            {
                throw new InvalidOperationException("Netloopers:SecretKey is not configured.");
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/oauth/token")
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "client_credentials" }),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", SecretKey);

            using var response = await httpClient.SendAsync(request, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Netloopers token request failed: {Status} {Body}", (int)response.StatusCode, Truncate(json));
                throw new InvalidOperationException($"Netloopers returned {(int)response.StatusCode} for the token request.");
            }

            using var doc = JsonDocument.Parse(json);
            var root = Unwrap(doc.RootElement);
            var token = GetString(root, "access_token");
            if (string.IsNullOrEmpty(token))
            {
                throw new InvalidOperationException("Netloopers did not return an access token.");
            }

            // expires_in is an integer (seconds, ~3600). Refresh a minute early; assume 5 minutes if absent.
            var lifetimeSeconds = 300;
            if (root.TryGetProperty("expires_in", out var exp) && exp.ValueKind == JsonValueKind.Number && exp.TryGetInt32(out var e) && e > 0)
            {
                lifetimeSeconds = e;
            }

            cachedToken = token;
            cachedTokenExpiresUtc = DateTime.UtcNow.AddSeconds(Math.Max(30, lifetimeSeconds - 60));
            return token;
        }
        finally
        {
            TokenGate.Release();
        }
    }

    // Some responses are flat, some may be wrapped as { "success": true, "data": { ... } }; accept both.
    private static JsonElement Unwrap(JsonElement root) =>
        root.ValueKind == JsonValueKind.Object && root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object
            && !root.TryGetProperty("id", out _) && !root.TryGetProperty("access_token", out _)
            ? data
            : root;

    private static string? GetString(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string Truncate(string text) => text.Length <= 500 ? text : text[..500];
}
