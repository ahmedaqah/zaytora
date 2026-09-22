using Microsoft.AspNetCore.Identity;

namespace Numinds.Api.Models.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    // Property default (not a DB-level default) so every creation path --
    // Register, Google sign-in, SeedIdentity -- gets a real timestamp
    // automatically without each one having to set it explicitly. Powers
    // /admin/users' oldest-to-newest numbering (see UsersController.List).
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Set the first time SeedIdentity.RunAdminRoleSeedAsync grants this user
    // Admin because their email is listed under Admin:SeedEmails. Without
    // this, that seed re-adds the role on every app restart, silently
    // undoing a demotion an admin made through /admin/users -- this flag
    // makes the seed a true one-time bootstrap per email instead of a
    // standing override that fights the in-app admin management UI.
    public bool AdminSeedApplied { get; set; }

    // Set when UsersController.SendEngagementEmails contacts this account to
    // ask why they never placed an order -- guards the bulk-send endpoint
    // against emailing the same never-ordered user twice on a re-run.
    public DateTime? EngagementEmailSentAt { get; set; }
}
