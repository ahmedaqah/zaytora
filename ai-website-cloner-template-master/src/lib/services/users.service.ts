import { apiClient } from "@/lib/api/client";
import type { ChangeUserRoleRequest, PagedQuery, PagedResult, SendEngagementEmailsResult, UserDto } from "@/types/api";

// Admin — /admin/users. Server-side search (DisplayName/Email) + pagination.
export function listUsers(query: PagedQuery = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return apiClient.get<PagedResult<UserDto>>(`/users${qs ? `?${qs}` : ""}`);
}

// Admin — promotes (role: "Admin") or demotes (role: null) a user. The
// backend rejects an admin trying to demote themselves.
export function changeUserRole(id: string, payload: ChangeUserRoleRequest) {
  return apiClient.patch<UserDto>(`/users/${id}/role`, payload);
}

// Admin — permanently removes another account. The backend rejects
// deleting your own account this way (use the account's own self-service
// delete for that).
export function deleteUser(id: string) {
  return apiClient.delete<void>(`/users/${id}`);
}

// Admin — how many never-ordered accounts a "send engagement emails" click
// would actually reach, so the confirmation dialog can show a real count.
export function getEngagementEmailEligibleCount() {
  return apiClient.get<SendEngagementEmailsResult>("/users/engagement-email-eligible-count");
}

// Admin — emails every account that registered but never placed a single
// order, asking (in a reply-friendly way) why they never ordered. Safe to
// call more than once: the backend only ever emails a given account once.
export function sendEngagementEmails() {
  return apiClient.post<SendEngagementEmailsResult>("/users/send-engagement-emails", {});
}
