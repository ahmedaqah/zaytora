import type { NextConfig } from "next";

function apiImageRemotePattern() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return [];

  try {
    const { protocol, hostname, port } = new URL(apiBaseUrl);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        port,
        pathname: "/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Hand-built invitations live in public/invites/<slug>/index.html. Next.js
  // serves public/ files only at their exact path (never a folder's index.html),
  // so /invites/<slug> and /invites/<slug>/ must be mapped to the file.
  async rewrites() {
    return [
      { source: "/invites/:slug", destination: "/invites/:slug/index.html" },
      { source: "/invites/:slug/", destination: "/invites/:slug/index.html" },
    ];
  },
  images: {
    remotePatterns: [
      // Lets next/image render template thumbnails served by the ASP.NET Core API.
      ...apiImageRemotePattern(),
      // The stock-photo backgroundImageUrl values SeedTemplates.cs seeds for
      // the full-bleed/boxed-hero demo templates (see backend/Numinds.Api/Data/SeedTemplates.cs).
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Admin-uploaded images (envelope photos, template covers, partner
      // logos, thank-you-suggestion cards) — see R2FileStorageService.cs.
      // Without this, next/image 400s on every one of them since Next 16
      // refuses to optimize a remote host that isn't explicitly whitelisted.
      { protocol: "https", hostname: "uploads.zaytorainvites.com", pathname: "/**" },
    ],
    // Next 16 added a hard SSRF guard that refuses to optimize any remote
    // image whose host resolves to a private/loopback IP — which is exactly
    // what "localhost" (our own ASP.NET Core API in dev) resolves to, so
    // every backend-hosted photo (envelope library, thank-you suggestions,
    // etc.) got silently rejected with "url parameter is not allowed"
    // despite matching remotePatterns above. Safe here since the "local
    // network" being allowed is this same machine's own backend, not an
    // arbitrary attacker-supplied target.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
