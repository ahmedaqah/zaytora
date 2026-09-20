import type { MetadataRoute } from "next";

const BASE_URL = "https://www.zaytorainvites.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Link-preview crawlers need to fetch /invitationpublic to read its
      // per-invitation og:title/og:description (see generateMetadata in
      // invitationpublic/page.tsx) -- without this exception, Facebook's
      // own Sharing Debugger returns a 403 for the page ("could be due to
      // a robots.txt block"), so a shared invitation unfurls as a bare,
      // generic link on WhatsApp/Facebook/Instagram instead of the actual
      // invitation card. Still kept out of admin/dashboard/etc like everyone
      // else -- these bots only ever fetch the one URL they're given.
      {
        userAgent: ["facebookexternalhit", "Facebot", "WhatsApp"],
        allow: ["/invitationpublic"],
        disallow: ["/admin", "/dashboard", "/account", "/studio", "/reset-password"],
      },
      {
        userAgent: "*",
        allow: "/",
        // Private/authenticated areas, plus per-couple invitation pages —
        // shareable by direct link, but not meant to be publicly searchable.
        disallow: ["/admin", "/dashboard", "/account", "/studio", "/invitationpublic", "/reset-password"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
