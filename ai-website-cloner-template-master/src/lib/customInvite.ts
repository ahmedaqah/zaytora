// Helpers for "custom HTML" private invitations: a finished, self-contained invitation page
// (one .html file with its audio/video/images inlined as base64) imported from
// /admin/private-invites. It is stored like every other private invitation (a PrivateInvite row,
// so the existing delete keeps working) but with config.kind === "custom-html":
//
//   config.media.page   public URL of the invitation's HTML (heavy audio/video already moved out)
//   config.media.music  public URL of the music; the server swaps it into <audio id="aud"> on every
//                       request, so changing the music never means re-uploading the page
//   config.media.assetN the other extracted files (videos), kept here so deleting the invitation
//                       also deletes them from storage
//   config.ogImage      link-preview image (the envelope poster)
//
// Pure functions only (no React, no Next imports): the admin page uses the extract/replace half in
// the browser, the /invites/p/<slug> route uses the override half on the server.

export const CUSTOM_INVITE_KIND = "custom-html";

// Only audio/video data URIs at least this long are moved out of the page. Images and fonts stay
// inline: the R2 upload pipeline would re-encode images, and without the audio/video the page is
// small enough (about 2 MB) to be served as is.
const HEAVY_MIN_LENGTH = 100_000;
const HEAVY_DATA_URI = /data:((?:audio|video)\/[a-z0-9.+-]+);base64,[A-Za-z0-9+/=]+/gi;

export interface HeavyAsset {
  dataUri: string;
  mime: string;
}

// ---------------------------------------------------------------- reading (browser, at import)

export function extractHeavyAssets(html: string): HeavyAsset[] {
  const seen = new Set<string>();
  const assets: HeavyAsset[] = [];
  for (const match of html.matchAll(HEAVY_DATA_URI)) {
    const dataUri = match[0];
    if (dataUri.length < HEAVY_MIN_LENGTH || seen.has(dataUri)) continue;
    seen.add(dataUri);
    assets.push({ dataUri, mime: match[1].toLowerCase() });
  }
  return assets;
}

export function replaceAssetUrls(html: string, urlByDataUri: ReadonlyMap<string, string>): string {
  let out = html;
  for (const [dataUri, url] of urlByDataUri) {
    out = out.split(dataUri).join(url);
  }
  return out;
}

export function dataUriToBlob(dataUri: string): Blob {
  const comma = dataUri.indexOf(",");
  const mime = /^data:([^;,]+)/.exec(dataUri.slice(0, comma))?.[1] ?? "application/octet-stream";
  const binary = atob(dataUri.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function findTag(html: string, tagName: string, id: string): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*?\\bid=["']${id}["'][^>]*>`, "i");
  return re.exec(html)?.[0] ?? null;
}

function readAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return match ? (match[1] ?? match[2] ?? "") : null;
}

// The invitation's music: <audio id="aud" src="data:audio/...">.
export function findMusicDataUri(html: string): string | null {
  const tag = findTag(html, "audio", "aud");
  const src = tag ? readAttribute(tag, "src") : null;
  return src && src.startsWith("data:audio/") ? src : null;
}

// The envelope video's poster (<video id="cv" poster="data:image/...">), used as the link-preview image.
export function findCoverPosterDataUri(html: string): string | null {
  const tag = findTag(html, "video", "cv");
  const poster = tag ? readAttribute(tag, "poster") : null;
  return poster && poster.startsWith("data:image/") ? poster : null;
}

// Content of <meta property|name="<key>" content="...">, "" when absent.
export function readMetaContent(html: string, key: string): string {
  const tag = metaPattern(key).exec(html)?.[0];
  return (tag ? readAttribute(tag, "content") : null) ?? "";
}

export function readInviteTitle(html: string): string {
  const match = /<title>([^<]*)<\/title>/i.exec(html);
  return match ? match[1].trim() : "";
}

// "https://example.com/invites/mohammed-and-manar/" -> "mohammed-and-manar"
export function readSlugHint(html: string): string {
  const tag = /<meta\s[^>]*?property=["']og:url["'][^>]*>/i.exec(html)?.[0];
  const url = tag ? readAttribute(tag, "content") : null;
  const match = url ? /\/invites\/([a-z0-9][a-z0-9-]{1,39})\/?(?:[?#].*)?$/.exec(url) : null;
  return match ? match[1] : "";
}

// ---------------------------------------------------------------- serving (server, per request)

export interface CustomOverrides {
  // Canonical public URL of this invitation (/invites/p/<slug>), for og:url.
  url: string;
  // Absolute link-preview image URL, or "" to keep whatever the page declares.
  ogImage: string;
  // Absolute music URL, or "" to keep the page's own <audio> source.
  music: string;
  // Link-preview title and text (WhatsApp etc.), or "" to keep what the page declares.
  title: string;
  description: string;
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c];
  });
}

function metaPattern(key: string): RegExp {
  const escaped = key.replace(/[.*+?^${}()|[\]\\:]/g, "\\$&");
  return new RegExp(`<meta\\s[^>]*?(?:property|name)=["']${escaped}["'][^>]*>`, "i");
}

function insertInHead(html: string, tag: string): string {
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => `${tag}</head>`) : `${tag}${html}`;
}

function setMeta(html: string, attribute: "property" | "name", key: string, content: string): string {
  const tag = `<meta ${attribute}="${key}" content="${esc(content)}">`;
  const pattern = metaPattern(key);
  return pattern.test(html) ? html.replace(pattern, () => tag) : insertInHead(html, tag);
}

function removeMeta(html: string, key: string): string {
  return html.replace(metaPattern(key), "");
}

function setAudioSource(html: string, src: string): string {
  const tag = findTag(html, "audio", "aud");
  if (!tag) return html;
  const attribute = `src="${esc(src)}"`;
  const hasSrc = /\bsrc=(?:"[^"]*"|'[^']*')/i.test(tag);
  const next = hasSrc
    ? tag.replace(/\bsrc=(?:"[^"]*"|'[^']*')/i, () => attribute)
    : tag.replace(/<audio\b/i, () => `<audio ${attribute}`);
  return html.replace(tag, () => next);
}

export function applyCustomOverrides(html: string, overrides: CustomOverrides): string {
  let out = html;
  if (overrides.music) {
    out = setAudioSource(out, overrides.music);
  }
  out = setMeta(out, "property", "og:url", overrides.url);
  if (overrides.title) {
    out = setMeta(out, "property", "og:title", overrides.title);
  }
  if (overrides.description) {
    out = setMeta(out, "property", "og:description", overrides.description);
    out = setMeta(out, "name", "description", overrides.description);
  }
  if (overrides.ogImage) {
    out = setMeta(out, "property", "og:image", overrides.ogImage);
    out = setMeta(out, "name", "twitter:image", overrides.ogImage);
    // The page declared 1200x630 for its old placeholder image; the real poster has other dimensions.
    out = removeMeta(out, "og:image:width");
    out = removeMeta(out, "og:image:height");
  }
  if (!metaPattern("robots").test(out)) {
    out = insertInHead(out, '<meta name="robots" content="noindex,nofollow">');
  }
  return out;
}
