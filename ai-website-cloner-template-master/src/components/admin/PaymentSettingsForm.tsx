"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, LoaderIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { getOrderedCountries, countryMatchesQuery } from "@/lib/countries";
import {
  listPaymentAccounts,
  upsertPaymentAccount,
  deletePaymentAccount,
} from "@/lib/services/paymentSettings.service";
import type { PaymentAccountDto, PaymentAccountWriteRequest } from "@/types/api";

const INTL_CODE = "INTL";

const COPY = {
  ar: {
    heading: "إعدادات الدفع",
    subheading:
      "لا توجد بوابة دفع إلكترونية — هذه هي حسابات استلام التحويل اليدوي، حساب لكل دولة يختارها العميل عند الدفع. لا تُخزَّن هنا أي بيانات CVV أو تاريخ انتهاء البطاقة.",
    intlTitle: "الحساب الدولي (الاحتياطي)",
    intlSubtitle: "يظهر تلقائياً لأي عميل يختار دولة لم تضِف لها حساباً خاصاً بعد.",
    perCountryHeading: "حسابات مخصّصة لكل دولة",
    searchPlaceholder: "ابحث عن دولة...",
    configured: "مُفعّل",
    notConfigured: "غير مُفعّل",
    recipientName: "اسم المستلم",
    accountNumber: "رقم الحساب / البطاقة",
    bankName: "اسم البنك (اختياري)",
    iban: "الآيبان (اختياري)",
    instructions: "تعليمات إضافية للعميل (اختياري)",
    save: "حفظ",
    saving: "جارٍ الحفظ...",
    saved: "تم الحفظ.",
    error: "تعذر الحفظ. حاول مرة أخرى.",
    loadError: "تعذر تحميل إعدادات الدفع.",
    remove: "إزالة (يرجع للحساب الاحتياطي)",
    removing: "جارٍ الإزالة...",
  },
  en: {
    heading: "Payment Settings",
    subheading:
      "There's no online payment gateway — these are the manual-transfer receiving accounts, one per country the customer picks at checkout. Never store a CVV or expiry date here.",
    intlTitle: "International Account (fallback)",
    intlSubtitle: "Shown automatically to any customer whose chosen country has no account of its own yet.",
    perCountryHeading: "Per-country accounts",
    searchPlaceholder: "Search for a country...",
    configured: "Configured",
    notConfigured: "Not configured",
    recipientName: "Recipient name",
    accountNumber: "Account / card number",
    bankName: "Bank name (optional)",
    iban: "IBAN (optional)",
    instructions: "Additional instructions for the customer (optional)",
    save: "Save",
    saving: "Saving...",
    saved: "Saved.",
    error: "Couldn't save. Try again.",
    loadError: "Couldn't load payment settings.",
    remove: "Remove (falls back to the international account)",
    removing: "Removing...",
  },
};

const inputClass =
  "w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-body-foreground">{label}</span>
      {children}
    </label>
  );
}

const EMPTY_ACCOUNT: PaymentAccountWriteRequest = {
  recipientName: "",
  accountNumber: "",
  bankName: "",
  iban: "",
  instructions: "",
};

type SaveState = "idle" | "saving" | "saved" | "error";

function AccountEditor({
  t,
  countryCode,
  initial,
  onSaved,
  onDeleted,
  allowRemove,
}: {
  t: (typeof COPY)["ar"];
  countryCode: string;
  initial: PaymentAccountDto | undefined;
  onSaved: (account: PaymentAccountDto) => void;
  onDeleted: () => void;
  allowRemove: boolean;
}) {
  const [form, setForm] = useState<PaymentAccountWriteRequest>(initial ?? EMPTY_ACCOUNT);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [removing, setRemoving] = useState(false);

  function patch(changes: Partial<PaymentAccountWriteRequest>) {
    setForm((current) => ({ ...current, ...changes }));
    setSaveState("idle");
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const saved = await upsertPaymentAccount(countryCode, {
        ...form,
        bankName: form.bankName?.trim() || null,
        iban: form.iban?.trim() || null,
        instructions: form.instructions?.trim() || null,
      });
      onSaved(saved);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await deletePaymentAccount(countryCode);
      onDeleted();
    } catch {
      setSaveState("error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t.recipientName}>
          <input value={form.recipientName} onChange={(e) => patch({ recipientName: e.target.value })} className={inputClass} />
        </Field>
        <Field label={t.accountNumber}>
          <input
            value={form.accountNumber}
            onChange={(e) => patch({ accountNumber: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
        </Field>
        <Field label={t.bankName}>
          <input value={form.bankName ?? ""} onChange={(e) => patch({ bankName: e.target.value })} className={inputClass} />
        </Field>
        <Field label={t.iban}>
          <input value={form.iban ?? ""} onChange={(e) => patch({ iban: e.target.value })} className={inputClass} dir="ltr" />
        </Field>
      </div>
      <div className="mt-3">
        <Field label={t.instructions}>
          <textarea
            value={form.instructions ?? ""}
            onChange={(e) => patch({ instructions: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="rounded-xl bg-gradient-to-r from-[#C8A24A] to-[#A68832] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState === "saving" ? t.saving : t.save}
        </button>
        {allowRemove && initial && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:bg-rose-950/50 disabled:opacity-60"
          >
            <TrashIcon className="size-3.5" />
            {removing ? t.removing : t.remove}
          </button>
        )}
        {saveState === "saved" && <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t.saved}</span>}
        {saveState === "error" && <span className="text-xs font-medium text-rose-700 dark:text-rose-400">{t.error}</span>}
      </div>
    </div>
  );
}

export function PaymentSettingsForm({ language }: { language: "ar" | "en" }) {
  const t = COPY[language];
  const [accounts, setAccounts] = useState<Record<string, PaymentAccountDto>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPaymentAccounts()
      .then((list) => {
        if (cancelled) return;
        setAccounts(Object.fromEntries(list.map((a) => [a.countryCode, a])));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t.loadError);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countries = useMemo(() => getOrderedCountries(language), [language]);
  const filteredCountries = useMemo(() => countries.filter((c) => countryMatchesQuery(c, search)), [countries, search]);

  function handleSaved(countryCode: string, account: PaymentAccountDto) {
    setAccounts((current) => ({ ...current, [countryCode]: account }));
  }

  function handleDeleted(countryCode: string) {
    setAccounts((current) => {
      const next = { ...current };
      delete next[countryCode];
      return next;
    });
  }

  if (loadError) {
    return <p className="text-sm text-rose-700 dark:text-rose-400">{loadError}</p>;
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">{t.heading}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.subheading}</p>
      </div>

      {/* International fallback — always visible, never removable. */}
      <div className="rounded-2xl border border-gold/30 bg-gold/5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{t.intlTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.intlSubtitle}</p>
          </div>
          {accounts[INTL_CODE] && (
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {t.configured}
            </span>
          )}
        </div>
        <AccountEditor
          t={t}
          countryCode={INTL_CODE}
          initial={accounts[INTL_CODE]}
          onSaved={(account) => handleSaved(INTL_CODE, account)}
          onDeleted={() => handleDeleted(INTL_CODE)}
          allowRemove={false}
        />
      </div>

      {/* Per-country overrides. */}
      <div className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="border-b border-border p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">{t.perCountryHeading}</p>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-full border border-border bg-background/5 py-2 ps-9 pe-4 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]"
            />
          </div>
        </div>

        <div className="max-h-[32rem] overflow-y-auto">
          {filteredCountries.map((country) => {
            const isOpen = expanded === country.code;
            const configured = Boolean(accounts[country.code]);
            return (
              <div key={country.code} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : country.code)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-gold/5"
                >
                  <span className="text-sm text-body-foreground">{country[language]}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                        configured
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                          : "bg-background/10 text-muted-foreground"
                      )}
                    >
                      {configured && <CheckIcon className="size-3" />}
                      {configured ? t.configured : t.notConfigured}
                    </span>
                    <ChevronDownIcon
                      className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    />
                  </span>
                </button>
                {isOpen && (
                  <AccountEditor
                    t={t}
                    countryCode={country.code}
                    initial={accounts[country.code]}
                    onSaved={(account) => handleSaved(country.code, account)}
                    onDeleted={() => handleDeleted(country.code)}
                    allowRemove
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
