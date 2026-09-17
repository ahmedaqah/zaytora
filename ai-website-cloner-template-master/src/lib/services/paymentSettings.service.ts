import { apiClient } from "@/lib/api/client";
import type { PaymentAccountDto, PaymentAccountWriteRequest } from "@/types/api";

// Admin-only in both directions — see /admin/settings' Payment Settings
// section. Every configured country's receiving account, plus the
// always-present "INTL" fallback once it's been saved at least once.
export function listPaymentAccounts() {
  return apiClient.get<PaymentAccountDto[]>("/payment-settings");
}

// countryCode is an ISO 3166-1 alpha-2 code, "PS48" for the occupied
// Palestinian interior, or "INTL" for the fallback (see src/lib/countries.ts).
export function upsertPaymentAccount(countryCode: string, payload: PaymentAccountWriteRequest) {
  return apiClient.put<PaymentAccountDto>(`/payment-settings/${countryCode}`, payload);
}

// Removes a country's own override so it falls back to "INTL" again. The
// fallback itself can't be deleted this way (only edited).
export function deletePaymentAccount(countryCode: string) {
  return apiClient.delete<void>(`/payment-settings/${countryCode}`);
}
