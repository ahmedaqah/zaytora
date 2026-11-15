"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { verifyCardPayment } from "@/lib/services/orders.service";

const COPY = {
  ar: {
    checking: "جارٍ تأكيد الدفع...",
    checkingHint: "لا تغلق الصفحة، يستغرق التأكيد لحظات.",
    paidTitle: "تم الدفع وتفعيل دعوتك",
    paidHint: "يمكنك الآن مشاركة دعوتك ومتابعتها من لوحة التحكم.",
    pendingTitle: "ما زلنا نؤكد دفعتك",
    pendingHint: "إذا تم خصم المبلغ فسيتم تفعيل دعوتك تلقائياً خلال دقائق، وسيصلك بريد تأكيد. لا حاجة لأي إجراء إضافي.",
    failedTitle: "لم تكتمل عملية الدفع",
    failedHint: "لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى من لوحة التحكم أو استخدام التحويل البنكي.",
    missingTitle: "لم نجد الطلب",
    missingHint: "افتح لوحة التحكم لمتابعة طلباتك.",
    dashboard: "الذهاب للوحة التحكم",
  },
  en: {
    checking: "Confirming your payment...",
    checkingHint: "Please keep this page open, it only takes a moment.",
    paidTitle: "Payment received — your invitation is active",
    paidHint: "You can now share your invitation and follow it from your dashboard.",
    pendingTitle: "We're still confirming your payment",
    pendingHint: "If you were charged, your invitation activates automatically within a few minutes and you'll get a confirmation email. Nothing else is needed.",
    failedTitle: "The payment wasn't completed",
    failedHint: "You were not charged. You can try again from your dashboard or use the bank transfer.",
    missingTitle: "We couldn't find that order",
    missingHint: "Open your dashboard to follow your orders.",
    dashboard: "Go to dashboard",
  },
};

type ViewState = "checking" | "paid" | "pending" | "failed" | "missing";

const POLL_MS = 3000;
const MAX_POLLS = 30; // ~90 s, then fall back to "still confirming"

// Where the customer lands after the hosted checkout. The query string (status, payment_id, ...)
// is only used to word the message: each poll asks our own API to re-check the payment with the
// gateway (and approve the order if it was really paid), then reports the order's status.
export function PaymentReturnView() {
  const { language } = useLanguage();
  const t = COPY[language];
  const params = useSearchParams();
  // order_id comes from the address bar, so only a real order id (a GUID) is ever used to call our API.
  const rawOrderId = params.get("order_id") ?? "";
  const orderId = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(rawOrderId) ? rawOrderId : "";
  const gatewayStatus = (params.get("status") ?? "").toLowerCase();
  const gatewayFailed = ["failed", "cancelled", "canceled", "expired"].includes(gatewayStatus);

  const [state, setState] = useState<ViewState>(orderId ? "checking" : "missing");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    async function poll() {
      attempts += 1;
      try {
        const order = await verifyCardPayment(orderId);
        if (cancelled) return;
        if (order.paymentStatus === "paid") {
          setState("paid");
          return;
        }
        if (gatewayFailed || order.paymentStatus === "failed") {
          setState("failed");
          return;
        }
      } catch {
        if (cancelled) return;
        // A transient error: keep trying until the poll budget is spent.
      }
      if (attempts >= MAX_POLLS) {
        setState("pending");
        return;
      }
      timer = window.setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, gatewayFailed]);

  const content = {
    checking: { title: t.checking, hint: t.checkingHint },
    paid: { title: t.paidTitle, hint: t.paidHint },
    pending: { title: t.pendingTitle, hint: t.pendingHint },
    failed: { title: t.failedTitle, hint: t.failedHint },
    missing: { title: t.missingTitle, hint: t.missingHint },
  }[state];

  return (
    <main aria-live="polite" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        {content.title}
      </h1>
      <p className="text-sm leading-relaxed text-body-foreground">{content.hint}</p>
      {state !== "checking" && (
        <Link
          href="/dashboard"
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-gold py-3 text-sm font-medium text-white transition-colors hover:bg-gold/90"
        >
          {t.dashboard}
        </Link>
      )}
    </main>
  );
}
