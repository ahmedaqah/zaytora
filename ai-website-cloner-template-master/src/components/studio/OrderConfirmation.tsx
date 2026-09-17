"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, InfoIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import type { OrderDto, PaymentAccountDto } from "@/types/api";

const COPY = {
  ar: {
    heading: "تم إنشاء طلبك",
    subheading: "طلبك قيد الانتظار — أكمل التحويل أدناه لتفعيل دعوتك.",
    orderRef: "رقم الطلب",
    amountDue: "المبلغ المطلوب",
    transferHeading: "حوّل المبلغ إلى",
    recipientName: "الاسم",
    accountNumber: "رقم الحساب",
    bankName: "البنك",
    iban: "الآيبان",
    instructions: "تعليمات إضافية",
    notConfigured: "لم يقم الأدمن بإعداد وسيلة استلام الدفع بعد. تواصل معنا لإتمام الطلب.",
    pendingNotice: "سيتم تفعيل دعوتك خلال 24 ساعة من تأكيد استلام التحويل من قِبَلنا.",
    copied: "تم النسخ",
    backToDashboard: "الذهاب للوحة التحكم",
  },
  en: {
    heading: "Your order has been created",
    subheading: "Your order is pending — complete the transfer below to activate your invitation.",
    orderRef: "Order reference",
    amountDue: "Amount due",
    transferHeading: "Send the payment to",
    recipientName: "Name",
    accountNumber: "Account number",
    bankName: "Bank",
    iban: "IBAN",
    instructions: "Additional instructions",
    notConfigured: "The admin hasn't set up a receiving account yet. Contact us to complete this order.",
    pendingNotice: "Your invitation activates once we confirm the transfer was received — usually within 24 hours.",
    copied: "Copied",
    backToDashboard: "Go to dashboard",
  },
};

function CopyableRow({ label, value, copiedLabel }: { label: string; value: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-gold"
        dir="ltr"
      >
        {value}
        {copied ? (
          <CheckIcon className="size-3.5 text-emerald-700 dark:text-emerald-400" />
        ) : (
          <CopyIcon className="size-3.5 text-muted-foreground" />
        )}
      </button>
      {copied && <span className="sr-only">{copiedLabel}</span>}
    </div>
  );
}

export function OrderConfirmation({
  order,
  paymentSettings,
}: {
  order: OrderDto;
  paymentSettings: PaymentAccountDto;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const hasReceivingAccount = Boolean(paymentSettings.recipientName && paymentSettings.accountNumber);

  return (
    <div>
      <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-l from-gold to-[#E4C878] px-6 py-5 text-white">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background/20">
          <CheckIcon className="size-5" />
        </span>
        <div>
          <p className="text-base font-semibold">{t.heading}</p>
          <p className="text-xs text-white/85">{t.subheading}</p>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        <div className="space-y-2 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-foreground">{t.orderRef}</span>
            <span dir="ltr" className="font-mono text-xs text-muted-foreground">
              {order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span className="text-foreground">{t.amountDue}</span>
            <span dir="ltr" className="text-gold">
              {order.currency} {order.convertedAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {hasReceivingAccount ? (
          <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
            <p className="mb-2 text-sm font-semibold text-foreground">{t.transferHeading}</p>
            <div className="divide-y divide-border">
              <CopyableRow label={t.recipientName} value={paymentSettings.recipientName} copiedLabel={t.copied} />
              <CopyableRow label={t.accountNumber} value={paymentSettings.accountNumber} copiedLabel={t.copied} />
              {paymentSettings.bankName && (
                <CopyableRow label={t.bankName} value={paymentSettings.bankName} copiedLabel={t.copied} />
              )}
              {paymentSettings.iban && (
                <CopyableRow label={t.iban} value={paymentSettings.iban} copiedLabel={t.copied} />
              )}
            </div>
            {paymentSettings.instructions && (
              <p className="mt-3 text-sm leading-relaxed text-body-foreground">
                <span className="font-medium text-foreground">{t.instructions}: </span>
                {paymentSettings.instructions}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-100 dark:bg-amber-950/30 px-3.5 py-3">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-300">{t.notConfigured}</p>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-100 dark:bg-sky-950/30 px-3.5 py-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-400" />
          <p className="text-xs leading-relaxed text-sky-600 dark:text-sky-300">{t.pendingNotice}</p>
        </div>

        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-medium text-white transition-colors hover:bg-gold/90"
        >
          {t.backToDashboard}
        </Link>
      </div>
    </div>
  );
}
