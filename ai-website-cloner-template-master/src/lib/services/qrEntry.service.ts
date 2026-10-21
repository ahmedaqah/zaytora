import { apiClient } from "@/lib/api/client";
import type {
  QrCheckinRequest,
  QrCheckinResultDto,
  QrEntryStateDto,
  QrScanInfoDto,
  QrScannerDto,
} from "@/types/api";

// Owner (dashboard) -- the caller's own invitation only.
export function getQrEntryState(invitationId: string) {
  return apiClient.get<QrEntryStateDto>(`/invitations/${invitationId}/qr`);
}

export function createQrScanner(invitationId: string, label: string) {
  return apiClient.post<QrScannerDto>(`/invitations/${invitationId}/qr/scanners`, { label });
}

export function revokeQrScanner(invitationId: string, scannerId: string) {
  return apiClient.delete<void>(`/invitations/${invitationId}/qr/scanners/${scannerId}`);
}

export function deleteQrCheckin(invitationId: string, checkinId: string) {
  return apiClient.delete<void>(`/invitations/${invitationId}/qr/checkins/${checkinId}`);
}

// Scanner page -- authorised only by the link's token, no account.
export function getQrScanInfo(token: string) {
  return apiClient.get<QrScanInfoDto>(`/qr-scan/${encodeURIComponent(token)}`);
}

export function submitQrCheckin(token: string, payload: QrCheckinRequest) {
  return apiClient.post<QrCheckinResultDto>(`/qr-scan/${encodeURIComponent(token)}/checkins`, payload);
}
