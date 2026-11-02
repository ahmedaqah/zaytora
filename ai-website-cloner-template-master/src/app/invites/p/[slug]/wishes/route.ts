import { API_BASE_URL } from "@/lib/api/config";

// Congratulation messages shown at the end of a private invitation (config.rsvp.showWishes). Names and messages only:
// the API never returns counts or attendance here.
const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params;
  const empty = () => Response.json([], { headers: { "Cache-Control": "no-store" } });
  if (!SLUG.test(slug) || !API_BASE_URL) return empty();

  try {
    const res = await fetch(`${API_BASE_URL}/private-invites/${slug}/wishes`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return empty();
    return Response.json(await res.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return empty();
  }
}
