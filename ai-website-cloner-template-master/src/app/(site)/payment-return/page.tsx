import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentReturnView } from "./PaymentReturnView";

export const metadata: Metadata = {
  title: "حالة الدفع | ZAYTORA",
  robots: { index: false },
};

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturnView />
    </Suspense>
  );
}
