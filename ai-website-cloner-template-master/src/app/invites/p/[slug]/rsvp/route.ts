import { API_BASE_URL } from "@/lib/api/config";

// Same-origin relay for the answer a guest sends from a private invitation whose RSVP is collected on the site
// (config.rsvp.mode === "site"). The invitation page posts here instead of calling the API directly, so no CORS
// setup is needed. The API decides whether the invitation accepts answers at all.
const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;
const MAX_BODY_CHARS = 4000;

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !API_BASE_URL) return new Response("Not found", { status: 404 });

  const body = await request.text();
  if (body.length > MAX_BODY_CHARS) return new Response("Too large", { status: 413 });

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/private-invites/${slug}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return new Response("Upstream unreachable", { status: 502 });
  }
  return new Response(null, { status: upstream.ok ? 204 : upstream.status === 404 || upstream.status === 400 || upstream.status === 429 ? upstream.status : 502 });
}
