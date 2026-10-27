// Same-origin relay for media files the invite builder re-opens from storage (fonts, the cover picture).
// A browser refuses to use a font, or to draw a picture onto a canvas, when the file comes from another
// origin that sends no CORS headers (our R2 storage domain), so a saved invitation's font and link-preview
// image stopped working inside the builder until they were uploaded again. Fetching them here (server to
// server) and serving them from the site's own origin avoids that. Only files from our own storage hosts.
const ALLOWED_HOSTS = new Set(["uploads.zaytorainvites.com", "api.zaytorainvites.com", "zaytora-api.onrender.com"]);
const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("u") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { redirect: "error" });
  } catch {
    return new Response("Upstream unreachable", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: upstream.status === 404 ? 404 : 502 });
  }
  const length = Number(upstream.headers.get("content-length") ?? "0");
  if (length > MAX_BYTES) {
    return new Response("Too large", { status: 413 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
