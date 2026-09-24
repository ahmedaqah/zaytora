using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Models.Entities;

namespace Numinds.Api.Data;

// IDataProtectionKeyContext: persists auth-cookie encryption keys in this
// same database instead of the container's local disk — without it, every
// host redeploy (a new, empty container filesystem) mints a fresh key and
// silently invalidates every logged-in user's session cookie.
public class NumindsDbContext(DbContextOptions<NumindsDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IDataProtectionKeyContext
{
    public DbSet<Microsoft.AspNetCore.DataProtection.EntityFrameworkCore.DataProtectionKey> DataProtectionKeys => Set<Microsoft.AspNetCore.DataProtection.EntityFrameworkCore.DataProtectionKey>();

    public DbSet<Template> Templates => Set<Template>();
    public DbSet<Envelope> Envelopes => Set<Envelope>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<RsvpResponse> RsvpResponses => Set<RsvpResponse>();
    public DbSet<CapturedPhoto> CapturedPhotos => Set<CapturedPhoto>();
    public DbSet<ContactSettings> ContactSettings => Set<ContactSettings>();
    public DbSet<ContactWhatsAppNumber> ContactWhatsAppNumbers => Set<ContactWhatsAppNumber>();
    public DbSet<PaymentAccount> PaymentAccounts => Set<PaymentAccount>();
    public DbSet<PricingSettings> PricingSettings => Set<PricingSettings>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ThankYouSuggestion> ThankYouSuggestions => Set<ThankYouSuggestion>();
    public DbSet<MusicSuggestion> MusicSuggestions => Set<MusicSuggestion>();
    public DbSet<SupportMessage> SupportMessages => Set<SupportMessage>();

    // Fixed id so the seed row (and its child WhatsApp numbers below) stay
    // stable across migrations — same reasoning as SeedTemplates' fixed GUIDs.
    private static readonly Guid ContactSettingsSeedId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PricingSettingsSeedId = Guid.Parse("55555555-5555-5555-5555-555555555555");

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Template>(entity =>
        {
            entity.Property(t => t.Code).HasMaxLength(32).IsRequired();
            entity.Property(t => t.Category).HasMaxLength(64).IsRequired();
            entity.Property(t => t.ImageUrl).HasMaxLength(512).IsRequired();
            // Longer than ImageUrl — external stock-photo URLs (see
            // SeedTemplates) carry query strings well past 512 chars.
            entity.Property(t => t.BackgroundImageUrl).HasMaxLength(1024);
            entity.Property(t => t.Layout).HasMaxLength(32).IsRequired();
            // Palette tokens are always plain hex ("#0f2419") or two comma-
            // separated hex stops for PageBg — 32 chars comfortably covers
            // either case.
            entity.Property(t => t.PageBg).HasMaxLength(32);
            entity.Property(t => t.CardBg).HasMaxLength(32);
            entity.Property(t => t.TextColor).HasMaxLength(32);
            entity.Property(t => t.PrimaryAccent).HasMaxLength(32);
            entity.Property(t => t.DefaultNamesFont).HasMaxLength(32);
            // Same length rationale as BackgroundImageUrl above — external
            // stock-art URLs carry long query strings.
            entity.Property(t => t.HeroIllustrationUrl).HasMaxLength(1024);
            entity.Property(t => t.DecorationImageUrl).HasMaxLength(1024);
            entity.Property(t => t.OpeningVideoUrl).HasMaxLength(1024);
            entity.Property(t => t.AmbientVideoUrl).HasMaxLength(1024);
            entity.Property(t => t.AmbientEffect).HasMaxLength(16);
            entity.Property(t => t.EnvelopeCtaTextAr).HasMaxLength(80);
            entity.Property(t => t.EnvelopeCtaTextEn).HasMaxLength(80);
            entity.Property(t => t.EnvelopeCtaShape).HasMaxLength(16);
            entity.Property(t => t.EnvelopeCtaBgColor).HasMaxLength(32);
            entity.Property(t => t.EnvelopeCtaTextColor).HasMaxLength(32);
            // The four scene-style switches — short fixed keywords
            // ("waxseal", "archIslamic", "scratch", "default"), same length
            // budget as AmbientEffect above.
            entity.Property(t => t.EnvelopeStyle).HasMaxLength(16);
            entity.Property(t => t.HeroFrameStyle).HasMaxLength(16);
            entity.Property(t => t.DateRevealStyle).HasMaxLength(16);
            entity.Property(t => t.InvitationCardStyle).HasMaxLength(16);
            entity.Property(t => t.SceneLayoutStyle).HasMaxLength(16);
            // ~10 sections * a solid/gradient entry or a hosted image URL
            // each, plus an optional per-section text color -- comfortably
            // under this even with every section filled in.
            entity.Property(t => t.ScenesJson).HasMaxLength(4096).IsRequired();
            entity.HasIndex(t => t.Code).IsUnique();

            entity.HasOne(t => t.Envelope)
                .WithMany(e => e.Templates)
                .HasForeignKey(t => t.EnvelopeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasData(SeedTemplates.All);
        });

        builder.Entity<Envelope>(entity =>
        {
            entity.Property(e => e.Name).HasMaxLength(64).IsRequired();
            // Same length rationale as Template.BackgroundImageUrl — an
            // admin-uploaded photo's URL may carry a long query string.
            entity.Property(e => e.PhotoUrl).HasMaxLength(1024).IsRequired();
            entity.Property(e => e.OpeningStyle).HasMaxLength(16).IsRequired();
            // Enough room for well over a dozen fold points ({"x":00.0,"y":00.0} is
            // ~20 chars each) — more than any real envelope photo would ever need.
            entity.Property(e => e.FoldPointsJson).HasMaxLength(2048);

            // Starts empty — an admin adds these from /admin/envelopes as
            // needed, no fake seed data.
        });

        builder.Entity<Invitation>(entity =>
        {
            entity.Property(i => i.Status).HasMaxLength(32).IsRequired();
            entity.Property(i => i.ShareCode).HasMaxLength(12);

            entity.HasOne(i => i.User)
                .WithMany()
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(i => i.Template)
                .WithMany(t => t.Invitations)
                .HasForeignKey(i => i.TemplateId)
                .OnDelete(DeleteBehavior.SetNull);

            // GuestId is a plain Guid?, not a foreign key, so it doesn't pick
            // up EF's automatic FK index the way UserId does — yet it's the
            // lookup key for every anonymous visitor's Create (cap check) and
            // List (dashboard) call, so it needs its own index just as much.
            entity.HasIndex(i => i.GuestId);

            // Nullable + unique: Postgres treats multiple NULLs as distinct,
            // so old rows without a ShareCode yet don't collide with each
            // other while it's being lazily backfilled (see List).
            entity.HasIndex(i => i.ShareCode).IsUnique();
        });

        builder.Entity<RsvpResponse>(entity =>
        {
            entity.Property(r => r.GuestName).HasMaxLength(128).IsRequired();

            entity.HasOne(r => r.Invitation)
                .WithMany(i => i.Responses)
                .HasForeignKey(r => r.InvitationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CapturedPhoto>(entity =>
        {
            entity.Property(p => p.PhotoUrl).HasMaxLength(512).IsRequired();

            entity.HasOne(p => p.Invitation)
                .WithMany(i => i.CapturedPhotos)
                .HasForeignKey(p => p.InvitationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ContactSettings>(entity =>
        {
            entity.Property(c => c.Email).HasMaxLength(256).IsRequired();
            entity.Property(c => c.SecondaryEmail).HasMaxLength(256);
            entity.Property(c => c.ResponseTimeText).HasMaxLength(32).IsRequired();
            entity.Property(c => c.AvailabilityText).HasMaxLength(32).IsRequired();
            entity.Property(c => c.InstagramUrl).HasMaxLength(512);
            entity.Property(c => c.TikTokUrl).HasMaxLength(512);

            entity.HasData(new ContactSettings
            {
                Id = ContactSettingsSeedId,
                Email = "support@numinds.me",
                SecondaryEmail = "numindsdesign@gmail.com",
                ResponseTimeText = "1H",
                AvailabilityText = "7/24",
                AvailableWorldwide = true,
            });
        });

        builder.Entity<ContactWhatsAppNumber>(entity =>
        {
            entity.Property(w => w.CountryCode).HasMaxLength(4).IsRequired();
            entity.Property(w => w.PhoneNumber).HasMaxLength(32).IsRequired();

            entity.HasOne<ContactSettings>()
                .WithMany(c => c.WhatsAppNumbers)
                .HasForeignKey(w => w.ContactSettingsId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasData(
                new ContactWhatsAppNumber
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    ContactSettingsId = ContactSettingsSeedId,
                    CountryCode = "SA",
                    PhoneNumber = "+966 55 123 4567",
                    SortOrder = 0,
                },
                new ContactWhatsAppNumber
                {
                    Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    ContactSettingsId = ContactSettingsSeedId,
                    CountryCode = "GB",
                    PhoneNumber = "+44 7911 123456",
                    SortOrder = 1,
                }
            );
        });

        builder.Entity<PaymentAccount>(entity =>
        {
            entity.Property(p => p.CountryCode).HasMaxLength(8).IsRequired();
            entity.Property(p => p.RecipientName).HasMaxLength(128).IsRequired();
            entity.Property(p => p.AccountNumber).HasMaxLength(64).IsRequired();
            entity.Property(p => p.BankName).HasMaxLength(128);
            entity.Property(p => p.Iban).HasMaxLength(64);
            entity.Property(p => p.Instructions).HasMaxLength(1024);
            entity.HasIndex(p => p.CountryCode).IsUnique();

            // No HasData seed here on purpose -- the migration that
            // introduces this table carries the old singleton
            // PaymentSettings row's real data forward as the "INTL" row
            // via raw SQL instead, so a real admin's already-filled-in
            // account isn't silently lost. A fresh database genuinely
            // starts with zero rows until the admin configures one.
        });

        builder.Entity<PricingSettings>(entity =>
        {
            entity.Property(p => p.DefaultPartnerDiscountType).HasMaxLength(16).IsRequired();
            entity.Property(p => p.PlatformDiscountType).HasMaxLength(16).IsRequired();
            entity.Property(p => p.PlatformDiscountCode).HasMaxLength(32).IsRequired();
            entity.Property(p => p.DefaultCurrency).HasMaxLength(8).IsRequired();
            entity.Property(p => p.BasePriceUsd).HasColumnType("decimal(10,2)");
            entity.Property(p => p.QrRateUsd).HasColumnType("decimal(10,2)");
            entity.Property(p => p.GiftFeePercent).HasColumnType("decimal(10,2)");
            entity.Property(p => p.DefaultPartnerDiscountValue).HasColumnType("decimal(10,2)");
            entity.Property(p => p.PlatformDiscountValue).HasColumnType("decimal(10,2)");

            // Seeded with the platform's real current pricing (was
            // previously only a client-side default in pricingConfig.ts /
            // discountConfig.ts) — day-one behavior is unchanged, it's just
            // persisted for real now.
            entity.HasData(new PricingSettings
            {
                Id = PricingSettingsSeedId,
                BasePriceUsd = 17.99m,
                QrRateUsd = 0.45m,
                GiftFeePercent = 5m,
                DefaultPartnerDiscountType = "percent",
                DefaultPartnerDiscountValue = 33.3m,
                PlatformDiscountType = "percent",
                PlatformDiscountValue = 33.3m,
                PlatformDiscountCode = "PARTNER2026",
            });
        });

        builder.Entity<Order>(entity =>
        {
            entity.Property(o => o.CustomerName).HasMaxLength(128).IsRequired();
            entity.Property(o => o.CustomerEmail).HasMaxLength(256).IsRequired();
            entity.Property(o => o.PromoCodeUsed).HasMaxLength(64);
            entity.Property(o => o.Currency).HasMaxLength(8).IsRequired();
            entity.Property(o => o.PaymentStatus).HasMaxLength(16).IsRequired();
            entity.Property(o => o.AdminNote).HasMaxLength(512);
            entity.Property(o => o.AmountUsd).HasColumnType("decimal(10,2)");
            entity.Property(o => o.ConvertedAmount).HasColumnType("decimal(12,2)");

            // Backs OrdersController.List's search-as-you-type (customer
            // name/email) so it stays fast as orders accumulate.
            entity.HasIndex(o => o.CustomerName);
            entity.HasIndex(o => o.CustomerEmail);

            // No navigation collection on Invitation — a one-way reference is
            // enough here, nothing currently needs "this invitation's orders".
            // SetNull (not Cascade): a customer can delete their own
            // invitation at any status, including "paid" -- an order's
            // revenue/payment history must survive that, not vanish along
            // with the invitation content it was for.
            entity.HasOne(o => o.Invitation)
                .WithMany()
                .HasForeignKey(o => o.InvitationId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Partner>(entity =>
        {
            entity.Property(p => p.BusinessName).HasMaxLength(128).IsRequired();
            entity.Property(p => p.ApplicantName).HasMaxLength(128).IsRequired();
            entity.Property(p => p.Email).HasMaxLength(256).IsRequired();
            entity.Property(p => p.Category).HasMaxLength(32).IsRequired();
            entity.Property(p => p.Country).HasMaxLength(64).IsRequired();
            entity.Property(p => p.CountryFlag).HasMaxLength(8).IsRequired();
            entity.Property(p => p.Whatsapp).HasMaxLength(32).IsRequired();
            entity.Property(p => p.Tagline).HasMaxLength(512);
            entity.Property(p => p.InstagramUrl).HasMaxLength(512);
            entity.Property(p => p.TikTokUrl).HasMaxLength(512);
            entity.Property(p => p.FacebookUrl).HasMaxLength(512);
            entity.Property(p => p.WebsiteUrl).HasMaxLength(512);
            entity.Property(p => p.LogoUrl).HasMaxLength(512);
            entity.Property(p => p.Status).HasMaxLength(16).IsRequired();
            entity.Property(p => p.PromoCode).HasMaxLength(64);
            entity.Property(p => p.DiscountType).HasMaxLength(16);
            entity.Property(p => p.RevenueUsd).HasColumnType("decimal(10,2)");
            entity.Property(p => p.DiscountValue).HasColumnType("decimal(10,2)");
            entity.HasIndex(p => p.PromoCode).IsUnique().HasFilter("\"PromoCode\" IS NOT NULL");
            // One application per account (enforced in code too, in
            // PartnersController.Apply) — legacy rows from before
            // applications required login stay NULL and are excluded here.
            entity.HasIndex(p => p.UserId).IsUnique().HasFilter("\"UserId\" IS NOT NULL");
            // Backs PartnersController.List's search-as-you-type.
            entity.HasIndex(p => p.BusinessName);
            entity.HasIndex(p => p.Email);

            // Starts empty — see AddOrdersPartnersReviews migration notes.
            // No HasData seed here: the previous mock partners were
            // fictional (.example emails) and carrying them into a real
            // table would just be fake data one layer deeper.
        });

        builder.Entity<Review>(entity =>
        {
            entity.Property(r => r.Name).HasMaxLength(128).IsRequired();
            entity.Property(r => r.Title).HasMaxLength(256);
            entity.Property(r => r.Body).HasMaxLength(2000).IsRequired();
            entity.Property(r => r.Country).HasMaxLength(64).IsRequired();
            entity.Property(r => r.CountryFlag).HasMaxLength(8).IsRequired();
            entity.Property(r => r.Status).HasMaxLength(16).IsRequired();
            // Backs ReviewsController.List's search-as-you-type.
            entity.HasIndex(r => r.Name);

            // Starts empty — same reasoning as Partner above.
        });

        builder.Entity<SupportMessage>(entity =>
        {
            entity.Property(m => m.Name).HasMaxLength(128).IsRequired();
            entity.Property(m => m.Email).HasMaxLength(256).IsRequired();
            entity.Property(m => m.Subject).HasMaxLength(200).IsRequired();
            entity.Property(m => m.Message).HasMaxLength(2000).IsRequired();
            // Backs the admin inbox's newest-first ordering.
            entity.HasIndex(m => m.ReceivedAt);
        });

        builder.Entity<ThankYouSuggestion>(entity =>
        {
            entity.Property(s => s.Label).HasMaxLength(64).IsRequired();
            entity.Property(s => s.ImageUrl).HasMaxLength(512).IsRequired();

            // Starts empty — admin uploads these manually, no fake seed cards.
        });
    }
}
