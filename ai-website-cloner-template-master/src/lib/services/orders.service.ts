import { apiClient } from "@/lib/api/client";
import type {
  CardCheckoutResponse,
  CreateOrderRequest,
  OrderCreatedResponse,
  OrderDto,
  PagedResult,
  PaymentStatus,
  PromoCodeCheckDto,
  UpdateOrderStatusRequest,
} from "@/types/api";

// Anonymous is allowed, same as invitations.service's createInvitation — a
// guest can check out before ever logging in. Returns the created order
// plus the admin's receiving-account details in one response.
export function createOrder(payload: CreateOrderRequest) {
  return apiClient.post<OrderCreatedResponse>("/orders", payload);
}

// Anonymous, unguessable id — lets a customer revisit their confirmation page.
export function getOrder(id: string) {
  return apiClient.get<OrderDto>(`/orders/${id}`);
}

// Admin only — /admin/orders and the Overview dashboard. Server-side status
// filter + search (indexed CustomerName/CustomerEmail/PromoCodeUsed) +
// pagination, since orders accumulate indefinitely.
export function listOrders(query: { status?: "all" | PaymentStatus; search?: string; page?: number; pageSize?: number } = {}) {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return apiClient.get<PagedResult<OrderDto>>(`/orders${qs ? `?${qs}` : ""}`);
}

// Anonymous, checkout's "تحقق" button — checks both the single
// platform-wide code and per-partner codes server-side, so a shopper gets a
// real yes/no answer for either kind instead of only the platform code being
// previewable client-side.
export function checkPromoCode(code: string) {
  return apiClient.get<PromoCodeCheckDto>(`/orders/promo-code/${encodeURIComponent(code)}`);
}

// Admin manually confirms (or rejects) the out-of-band bank transfer.
// Marking "paid" also flips the linked invitation's own status server-side.
export function updateOrderStatus(id: string, payload: UpdateOrderStatusRequest) {
  return apiClient.patch<OrderDto>(`/orders/${id}/status`, payload);
}

// Admin cleanup for stale/duplicate/test orders piling up in the table.
export function deleteOrder(id: string) {
  return apiClient.delete<void>(`/orders/${id}`);
}

// Admin nudges a customer whose order is still pending to go finish it.
// Backend rejects this for any order that isn't "pending".
export function sendOrderReminder(id: string) {
  return apiClient.post<OrderDto>(`/orders/${id}/send-reminder`);
}

// Anonymous — starts an online card payment for a pending order and returns the
// hosted checkout URL. The invitation is approved automatically by the payment
// gateway's server-to-server webhook once the payment really succeeds; the
// browser coming back from checkout is never what approves it.
export function payOrderByCard(id: string) {
  return apiClient.post<CardCheckoutResponse>(`/orders/${id}/pay-card`);
}
