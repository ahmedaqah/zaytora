import { apiClient, ApiError } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/api/config";
import type { RsvpResponseDto } from "@/types/api";

// Invitation content exactly as the shared template renderer
// (public/invites/_template/invite.js) reads it.
export type PrivateInviteConfig = Record<string, unknown>;

export interface PrivateInviteDto {
  slug: string;
  title: string;
  config: PrivateInviteConfig;
  createdAt: string;
  updatedAt: string;
  // Admin list only: e-mail of the customer account the invitation was handed to.
  ownerEmail?: string | null;
  // Temporarily switched off: the public page shows a "paused" notice until an admin switches it back on.
  isPaused?: boolean;
}

// Admin — every saved invitation, newest edit first.
export function listPrivateInvites() {
  return apiClient.get<PrivateInviteDto[]>("/private-invites");
}

export function getPrivateInvite(slug: string) {
  return apiClient.get<PrivateInviteDto>(`/private-invites/${encodeURIComponent(slug)}`);
}

// Admin — creates the invitation, or replaces it when the slug already exists.
// Uploads can take a while, so the save itself gets a longer timeout than the default.
export function savePrivateInvite(slug: string, payload: { title: string; config: PrivateInviteConfig }) {
  return apiClient.put<PrivateInviteDto>(`/private-invites/${encodeURIComponent(slug)}`, payload, {
    timeoutMs: 30_000,
  });
}

export function deletePrivateInvite(slug: string) {
  return apiClient.delete<void>(`/private-invites/${encodeURIComponent(slug)}`, { timeoutMs: 30_000 });
}

// Admin — deletes one previously uploaded media file (e.g. the old music after it was replaced).
// Best effort on the server: a URL that is not in the invitations' storage folder is rejected.
export function deletePrivateInviteMedia(url: string) {
  return apiClient.delete<void>(`/private-invites/media?url=${encodeURIComponent(url)}`, { timeoutMs: 30_000 });
}

// Admin — uploads one image/video/audio file (or an imported invitation's HTML page) and returns its public URL. Raw multipart
// fetch (apiClient always JSON-encodes), same pattern as uploadThankYouSuggestionImage.
export async function uploadPrivateInviteMedia(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/private-invites/media`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network error uploading file", 0);
  }

  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(payload?.message ?? response.statusText, response.status, payload);
  }
  return payload as { url: string };
}

// ---- Hand-over to a customer account + RSVPs collected on the site (config.rsvp.mode === "site") ----

// A card on the customer's dashboard: read-only, no editing.
export interface OwnedPrivateInviteDto {
  slug: string;
  title: string;
  url: string;
  name1?: string | null;
  name2?: string | null;
  dateText?: string | null;
  eventStart?: string | null;
  siteRsvp: boolean;
  showWishes: boolean;
  responsesCount: number;
  attendingCount: number;
  declinedCount: number;
  isPaused?: boolean;
  updatedAt: string;
}

// Admin — a one-time link (valid 7 days) the customer opens while signed in to receive the invitation.
export function createPrivateInviteTransferLink(slug: string) {
  return apiClient.post<{ url: string }>(`/private-invites/${encodeURIComponent(slug)}/transfer-link`, {});
}

// Customer — redeems the one-time link.
export function claimPrivateInvite(token: string) {
  return apiClient.post<{ slug: string }>("/private-invites/claim-transfer", { token });
}

// Customer — the invitations handed over to this account.
export function listMyPrivateInvites() {
  return apiClient.get<OwnedPrivateInviteDto[]>("/private-invites/mine");
}

// Owner / admin — every answer sent from the invitation page, newest first.
export function listPrivateInviteRsvps(slug: string) {
  return apiClient.get<RsvpResponseDto[]>(`/private-invites/${encodeURIComponent(slug)}/rsvp`);
}

export function deletePrivateInviteRsvp(slug: string, responseId: string) {
  return apiClient.delete<void>(`/private-invites/${encodeURIComponent(slug)}/rsvp/${encodeURIComponent(responseId)}`);
}

// Admin — pause / resume one invitation. Only a flag changes; nothing of the invitation is touched.
export function setPrivateInvitePaused(slug: string, paused: boolean) {
  return apiClient.post<{ paused: boolean }>(`/private-invites/${encodeURIComponent(slug)}/pause`, { paused });
}
