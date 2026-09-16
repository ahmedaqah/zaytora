import { apiClient, ApiError } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/api/config";
import type {
  CapturedPhotoDto,
  CapturedPhotosPageDto,
  ClaimInvitationTransferResponse,
  CreateInvitationRequest,
  InvitationDto,
  InvitationSummaryDto,
  InvitationTransferLinkDto,
  RsvpResponseDto,
  RsvpSubmissionRequest,
} from "@/types/api";
import type { InvitationDetail, UpdateInvitationPatch } from "@/types/studio";

export function createInvitation(payload: CreateInvitationRequest = {}) {
  return apiClient.post<InvitationDto>("/invitations", payload);
}

export function getInvitation(id: string) {
  return apiClient.get<InvitationDetail>(`/invitations/${id}`);
}

export function updateInvitation(id: string, patch: UpdateInvitationPatch) {
  return apiClient.put<InvitationDetail>(`/invitations/${id}`, patch);
}

// Lists only the caller's own invitations, for the dashboard's bookings
// table — by session if signed in, or by the anonymous GuestId tracking
// cookie otherwise, so guests see their own real invitations too.
export function listInvitations() {
  return apiClient.get<InvitationSummaryDto[]>("/invitations");
}

export function deleteInvitation(id: string) {
  return apiClient.delete<void>(`/invitations/${id}`);
}

// Admin only -- generates a one-time link that hands this invitation off to
// whichever account opens and claims it (see claimInvitationTransfer).
export function createInvitationTransferLink(id: string) {
  return apiClient.post<InvitationTransferLinkDto>(`/invitations/${id}/transfer-link`, {});
}

// Called by the /claim-invitation page once the visitor is signed in --
// whoever that is becomes the invitation's new owner.
export function claimInvitationTransfer(token: string) {
  return apiClient.post<ClaimInvitationTransferResponse>("/invitations/claim-transfer", { token });
}

// Admin-only diagnostic (see InvitationsController.GetOwnershipDebug) --
// surfaces UserId/GuestId/TransferToken, which the normal DTO never
// includes, for investigating a specific handoff-link report.
export function getInvitationOwnershipDebug(id: string) {
  return apiClient.get<{
    invitationId: string;
    status: string;
    userId: string | null;
    ownerEmail: string | null;
    guestId: string | null;
    transferToken: string | null;
    transferTokenExpiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>(`/invitations/${id}/ownership-debug`);
}

// Submitted by a guest viewing the published invitation, not its owner —
// anonymous is fine here the same way it's fine on createInvitation.
export function submitRsvp(id: string, payload: RsvpSubmissionRequest) {
  return apiClient.post<void>(`/invitations/${id}/rsvp`, payload);
}

// The caller's own invitation only (session or GuestId cookie, same as
// listInvitations). Powers the dashboard's "Responses" modal.
export function listRsvpResponses(id: string) {
  return apiClient.get<RsvpResponseDto[]>(`/invitations/${id}/rsvp`);
}

export function deleteRsvpResponse(id: string, responseId: string) {
  return apiClient.delete<void>(`/invitations/${id}/rsvp/${responseId}`);
}

// Anonymous — a guest's shot from the invitation's built-in camera
// (CameraOverlay.tsx), uploaded so the owner's dashboard "Captured" tab
// gets a copy too. Bypasses apiClient (always JSON-encodes) for a raw
// multipart fetch, same pattern as templates.service.ts's uploadTemplateImage.
export async function uploadCapturedPhoto(id: string, file: File): Promise<CapturedPhotoDto> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/invitations/${id}/captured-photos`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network error uploading photo", 0);
  }

  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(payload?.message ?? response.statusText, response.status, payload);
  }
  return payload as CapturedPhotoDto;
}

// The caller's own invitation only (session or GuestId cookie, same as
// listRsvpResponses). Powers the dashboard's GalleryModal "Captured" tab.
export function listCapturedPhotos(id: string, page: number, pageSize: number) {
  return apiClient.get<CapturedPhotosPageDto>(`/invitations/${id}/captured-photos?page=${page}&pageSize=${pageSize}`);
}

export function deleteCapturedPhoto(id: string, photoId: string) {
  return apiClient.delete<void>(`/invitations/${id}/captured-photos/${photoId}`);
}
