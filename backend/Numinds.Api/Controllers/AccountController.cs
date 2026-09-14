using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;
using Numinds.Api.Services;

namespace Numinds.Api.Controllers;

[ApiController]
[Route("api/account")]
public class AccountController(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager,
    IEmailSender emailSender,
    IMetaConversionsApiService metaConversions,
    IConfiguration configuration) : ControllerBase
{
    private string FrontendBaseUrl => configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";

    // returnUrl round-trips through Google's own redirect (embedded in the
    // callback URL we register as the OAuth redirect_uri) before we ever use
    // it, so an attacker who starts the flow with e.g.
    // "@evil.example/phish" would otherwise get it concatenated straight
    // onto FrontendBaseUrl -- "https://www.zaytorainvites.com@evil.example"
    // parses as evil.example with zaytorainvites.com as mere userinfo, an
    // open redirect served from our own login flow. Restricting to a single
    // leading "/" with no "://" anywhere keeps the concatenation on our own
    // origin no matter what follows.
    private static string SanitizeReturnUrl(string? returnUrl) =>
        !string.IsNullOrEmpty(returnUrl)
        && returnUrl.StartsWith('/')
        && !returnUrl.StartsWith("//")
        && !returnUrl.Contains("://")
            ? returnUrl
            : "/dashboard";

    // GET /api/account/me
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(await ToDtoAsync(user));
    }

    // POST /api/account/register
    // Creates the account and immediately signs it in (isPersistent: true,
    // matching Login below) so the caller lands authenticated without a
    // separate sign-in step. EmailConfirmed is set true — no email/SMS
    // verification flow exists yet, same shortcut SeedIdentity uses for the
    // demo user.
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<UserDto>> Register(RegisterRequest request)
    {
        var existing = await userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            return BadRequest(new { title = "A user with this email already exists" });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            DisplayName = request.DisplayName,
            PhoneNumber = request.PhoneNumber,
            PhoneNumberConfirmed = !string.IsNullOrWhiteSpace(request.PhoneNumber),
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var title = string.Join(" ", result.Errors.Select(e => e.Description));
            return BadRequest(new { title });
        }

        await signInManager.SignInAsync(user, isPersistent: true);

        // Referer is the actual page the browser's fetch() call was made
        // from (e.g. https://www.zaytorainvites.com/register) -- falls back
        // to the site root only for the rare client that omits it.
        var eventSourceUrl = Request.Headers.Referer.ToString() is { Length: > 0 } referer
            ? referer
            : FrontendBaseUrl;
        await metaConversions.SendCompleteRegistrationAsync(
            user.Email!,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString(),
            eventSourceUrl,
            request.Fbc,
            request.Fbp,
            HttpContext.RequestAborted);

        return Ok(await ToDtoAsync(user));
    }

    // POST /api/account/login
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<UserDto>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(new { title = "Invalid email or password." });
        }

        // lockoutOnFailure: true — layers Identity's own per-account lockout
        // (5 failed attempts -> 5 minute lockout by default) on top of the
        // "auth" rate limit above, so a single account can't be brute-forced
        // by spreading guesses across many IPs either.
        var result = await signInManager.PasswordSignInAsync(
            user, request.Password, isPersistent: true, lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            return Unauthorized(new { title = "Invalid email or password." });
        }

        return Ok(await ToDtoAsync(user));
    }

    // PATCH /api/account/me
    // Lets a signed-in user add/change their own phone number after the
    // fact — the only signup path that captures one today is email/password
    // registration with the field filled in; Google sign-in never collects
    // it, so this is how those accounts (and anyone who skipped it) can add
    // one later. Empty string clears it back to null rather than being
    // rejected, so a user can undo a typo'd number.
    [HttpPatch("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        if (request.PhoneNumber is not null)
        {
            var trimmed = request.PhoneNumber.Trim();
            user.PhoneNumber = trimmed.Length == 0 ? null : trimmed;
            user.PhoneNumberConfirmed = trimmed.Length > 0;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var title = string.Join(" ", result.Errors.Select(e => e.Description));
                return BadRequest(new { title });
            }
        }

        return Ok(await ToDtoAsync(user));
    }

    // POST /api/account/logout
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    // POST /api/account/forgot-password
    // Always returns 204 regardless of whether the email matches an account,
    // so the response can't be used to enumerate registered emails.
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is not null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetUrl = $"{FrontendBaseUrl}/reset-password" +
                $"?email={Uri.EscapeDataString(request.Email)}&token={Uri.EscapeDataString(token)}";

            await emailSender.SendAsync(
                request.Email,
                "Reset your Zaytora password",
                $"<p>Click the link below to reset your password:</p>" +
                $"<p><a href=\"{resetUrl}\">{resetUrl}</a></p>" +
                $"<p>If you didn't request this, you can ignore this email.</p>",
                cancellationToken);
        }

        return NoContent();
    }

    // POST /api/account/reset-password
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return BadRequest(new { title = "Invalid or expired reset link." });
        }

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var title = string.Join(" ", result.Errors.Select(e => e.Description));
            return BadRequest(new { title });
        }

        return NoContent();
    }

    // GET /api/account/external-login/google
    // The frontend triggers this with a full browser navigation (not fetch) —
    // it challenges Google, which redirects back to the callback below once
    // the user approves.
    [HttpGet("external-login/google")]
    public IActionResult ExternalLoginGoogle([FromQuery] string returnUrl = "/dashboard")
    {
        // Program.cs only registers the Google auth handler once real
        // credentials are configured (via env vars/user-secrets); challenging
        // an unregistered scheme throws and 500s instead of failing
        // gracefully, so guard it here the same way the frontend button is
        // meant to be hidden until Google sign-in is actually set up.
        if (string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientId"]))
        {
            return Redirect($"{FrontendBaseUrl}/login?error=google-not-configured");
        }

        var callbackUrl = $"{Request.Scheme}://{Request.Host}" +
            $"/api/account/external-login/callback?returnUrl={Uri.EscapeDataString(SanitizeReturnUrl(returnUrl))}";
        var properties = signInManager.ConfigureExternalAuthenticationProperties(GoogleDefaults.AuthenticationScheme, callbackUrl);
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    // GET /api/account/external-login/callback
    [HttpGet("external-login/callback")]
    public async Task<IActionResult> ExternalLoginCallback([FromQuery] string returnUrl = "/dashboard")
    {
        returnUrl = SanitizeReturnUrl(returnUrl);
        var info = await signInManager.GetExternalLoginInfoAsync();
        if (info is null)
        {
            return Redirect($"{FrontendBaseUrl}/login?error=external-login-failed");
        }

        var signInResult = await signInManager.ExternalLoginSignInAsync(
            info.LoginProvider, info.ProviderKey, isPersistent: true, bypassTwoFactor: true);
        if (signInResult.Succeeded)
        {
            return Redirect($"{FrontendBaseUrl}{returnUrl}");
        }

        var email = info.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Redirect($"{FrontendBaseUrl}/login?error=external-login-failed");
        }

        var isNewUser = false;
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            isNewUser = true;
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = info.Principal.FindFirstValue(ClaimTypes.Name) ?? email,
            };

            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                return Redirect($"{FrontendBaseUrl}/login?error=external-login-failed");
            }
        }

        var addLoginResult = await userManager.AddLoginAsync(user, info);
        if (!addLoginResult.Succeeded)
        {
            return Redirect($"{FrontendBaseUrl}/login?error=external-login-failed");
        }

        await signInManager.SignInAsync(user, isPersistent: true);

        if (isNewUser)
        {
            // No Referer here -- this request is Google's own server-side
            // redirect back to our callback, not the user's browser on a
            // frontend page. The page they're actually about to land on
            // (returnUrl) is the closest genuine substitute.
            await metaConversions.SendCompleteRegistrationAsync(
                user.Email!,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString(),
                $"{FrontendBaseUrl}{returnUrl}",
                fbc: null,
                fbp: null,
                HttpContext.RequestAborted);
        }

        return Redirect($"{FrontendBaseUrl}{returnUrl}");
    }

    // DELETE /api/account
    [HttpDelete]
    [Authorize]
    public async Task<IActionResult> DeleteAccount()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        await signInManager.SignOutAsync();

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return Problem("Failed to delete account.");
        }

        return NoContent();
    }

    private async Task<UserDto> ToDtoAsync(ApplicationUser user) => new()
    {
        Id = user.Id.ToString(),
        DisplayName = user.DisplayName,
        Email = user.Email ?? string.Empty,
        AvatarUrl = user.AvatarUrl,
        PhoneNumber = user.PhoneNumber,
        IsAdmin = await userManager.IsInRoleAsync(user, Roles.Admin),
    };
}
