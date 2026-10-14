import { API_BASE_URL } from "@/lib/api/config";
import { applyCustomOverrides, CUSTOM_INVITE_KIND } from "@/lib/customInvite";

// Public page of an invitation saved from /admin/invite-builder. The content comes from the
// API and is inlined into the HTML so the shared renderer (public/invites/_template/invite.js)
// can draw it without a second request, and so link previews (WhatsApp etc.) get the right
// title and image. Hand-built static invitations (e.g. /invites/kamal) are not affected: they
// live one path segment up and are served from public/ as before.
const SITE_ORIGIN = "https://www.zaytorainvites.com";
const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;

type Config = Record<string, unknown>;

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c];
  });
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function absoluteUrl(value: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? `${SITE_ORIGIN}${value}` : "";
}

function dateLabel(config: Config): string {
  const hero = obj(config.hero);
  if (str(hero.dateText)) return str(hero.dateText);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(obj(config.event).start));
  return m ? `${m[3]} · ${m[2]} · ${m[1]}` : "";
}

function page(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // No X-Robots-Tag header on purpose: the <meta name="robots"> in the page already keeps it out of search,
      // and /invites/kamal (whose WhatsApp preview works) is served without that header.
      "Cache-Control": status === 200 ? "public, max-age=0, s-maxage=30" : "no-store",
    },
  });
}

function notFound(): Response {
  return page(
    404,
    `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>الدعوة غير موجودة</title></head><body style="font-family:sans-serif;text-align:center;padding:4rem 1rem"><p>الدعوة غير موجودة أو تم حذفها.</p></body></html>`
  );
}

// Finished, self-contained invitation pages imported from /admin/private-invites (config.kind ===
// "custom-html", see src/lib/customInvite.ts). The page's HTML lives in storage; it is fetched here and
// served under this URL with the current music swapped in, so a music change takes effect without
// re-uploading the page, and with og:url / og:image pointing at this URL for link previews.
async function serveCustomInvite(slug: string, config: Config, request: Request): Promise<Response> {
  const media = obj(config.media);
  const pageUrl = str(media.page);
  if (!/^https:\/\//i.test(pageUrl)) return notFound();

  let html: string | null = null;
  for (const timeoutMs of [15_000, 25_000]) {
    try {
      const res = await fetch(pageUrl, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) {
        html = await res.text();
        break;
      }
    } catch {
      // timed out or network error: try again
    }
  }
  if (html === null) {
    return page(503, "<!doctype html><meta charset=utf-8><p>تعذّر تحميل الدعوة، حاول مجدداً بعد قليل.</p>");
  }

  const music = str(media.music);
  const meta = obj(config.meta);
  return page(
    200,
    applyCustomOverrides(html, {
      url: `${SITE_ORIGIN}/invites/p/${slug}${new URL(request.url).search}`,
      ogImage: absoluteUrl(str(config.ogImage)),
      music: /^https:\/\//i.test(music) ? music : "",
      title: str(meta.title),
      description: str(meta.description),
    })
  );
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !API_BASE_URL) return notFound();

  // Always read the invitation fresh: after an edit, a link preview must show the new cover and text, and a
  // stale cached copy (data cache or CDN) would hand WhatsApp the old tags. The API is awake right after a save
  // (the builder also opens this page then); if it was asleep, two attempts cover a visitor's wait.
  let loaded: Config | null = null;
  for (const timeoutMs of [10_000, 15_000]) {
    try {
      const res = await fetch(`${API_BASE_URL}/private-invites/${slug}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 404) return notFound();
      if (!res.ok) continue;
      const data = (await res.json()) as { config?: unknown };
      loaded = obj(data.config);
      break;
    } catch {
      // timed out or network error: try again
    }
  }
  if (!loaded) {
    return page(503, "<!doctype html><meta charset=utf-8><p>تعذّر تحميل الدعوة، حاول مجدداً بعد قليل.</p>");
  }
  const config: Config = loaded;
  if (str(config.kind) === CUSTOM_INVITE_KIND) return serveCustomInvite(slug, config, request);

  const hero = obj(config.hero);
  const meta = obj(config.meta);
  const media = obj(config.media);
  const names = [str(hero.name1), str(hero.name2)].filter(Boolean).join(` ${str(hero.connector) || "&"} `);
  const title = str(meta.title) || `${str(hero.occasion)} ${names}`.trim() || "دعوة";
  const description =
    str(meta.description) || [dateLabel(config), str(obj(config.location).venue)].filter(Boolean).join(" · ") || title;
  // og:url keeps the query string (e.g. ?v=2): WhatsApp/Facebook treat og:url as the canonical link and reuse
  // whatever they cached for it, so a stripped URL would pull a stale or failed preview back in.
  const search = new URL(request.url).search;
  const url = `${SITE_ORIGIN}/invites/p/${slug}${search}`;
  const image = absoluteUrl(str(config.ogImage)) || absoluteUrl(str(media.bgPoster)) || absoluteUrl(str(media.coverPoster));

  // </script> and U+2028/9 inside inlined JSON would break the page.
  const json = JSON.stringify({ config })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:image" content="${esc(image)}">\n` : ""}<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<style>html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Cinzel:wght@400;600&family=Katibeh&family=Lateef:wght@400;700&family=Reem+Kufi:wght@400;700&family=Mirza:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/invites/_template/invite.css">
</head>
<body>
<noscript>يتطلب عرض الدعوة تفعيل JavaScript.</noscript>
<script>window.__ZAYTORA_INVITE__=${json};</script>
<script src="/invites/_template/invite.js"></script>
</body>
</html>
`;
  return page(200, html);
}
