import { apiClient, ApiError } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/api/config";

// Invitation content exactly as the shared template renderer
// (public/invites/_template/invite.js) reads it.
export type PrivateInviteConfig = Record<string, unknown>;

export interface PrivateInviteDto {
  slug: string;
  title: string;
  config: PrivateInviteConfig;
  createdAt: string;
  updatedAt: string;
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

// Admin — uploads one image/video/audio file and returns its public URL. Raw multipart
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
