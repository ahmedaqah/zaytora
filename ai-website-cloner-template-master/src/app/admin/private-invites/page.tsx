"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { CheckIcon, CopyIcon, ExternalLinkIcon, EyeIcon, LockIcon } from "@/components/icons";

// Hand-built invitations served as static pages from /public/invites/<slug>/.
// They are unlisted: not linked from the public site, disallowed in robots.ts
// and noindex in their own <head>. Anyone holding the link (the guests) can open
// them, so this page is the only place they are listed and managed.
type PrivateInvite = {
  slug: string;
  path: string;
  title: { ar: string; en: string };
  date: string;
  time: { ar: string; en: string };
  venue: string;
};

const PRIVATE_INVITES: readonly PrivateInvite[] = [
  {
    slug: "kamal",
    path: "/invites/kamal",
    title: { ar: "حفل زفاف كمال وكريمته", en: "Kamal's wedding" },
    date: "17/12/2026",
    time: { ar: "من 7 مساءً إلى 11 مساءً", en: "7 PM to 11 PM" },
    venue: "Lara düğün salonu",
  },
];

const COPY = {
  ar: {
    subtitle: "دعوات خاصة مصمّمة يدوياً. لا تظهر في الموقع ولا في محركات البحث، ويفتحها فقط من يملك الرابط.",
    empty: "لا توجد دعوات خاصة بعد.",
    link: "رابط الدعوة",
    copy: "نسخ الرابط",
    copied: "تم النسخ",
    open: "فتح الدعوة",
    preview: "معاينة",
    hidePreview: "إخفاء المعاينة",
    note: "غير معلنة",
  },
  en: {
    subtitle: "Hand-built private invitations. Not listed on the site or in search engines; only people with the link can open them.",
    empty: "No private invitations yet.",
    link: "Invitation link",
    copy: "Copy link",
    copied: "Copied",
    open: "Open invitation",
    preview: "Preview",
    hidePreview: "Hide preview",
    note: "Unlisted",
  },
};

export default function AdminPrivateInvitesPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const fullUrl = (path: string) => `${window.location.origin}${path}`;

  async function copyLink(slug: string, path: string) {
    try {
      await navigator.clipboard.writeText(fullUrl(path));
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug((s) => (s === slug ? null : s)), 2000);
    } catch {
      // Clipboard can be blocked; the link is also shown as selectable text.
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      {PRIVATE_INVITES.length === 0 && <p className="text-sm text-muted-foreground">{t.empty}</p>}

      <ul className="space-y-4">
        {PRIVATE_INVITES.map((inv) => {
          const showing = previewSlug === inv.slug;
          return (
            <li key={inv.slug} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">{inv.title[language]}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {inv.date} · {inv.time[language]}
                  </p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {inv.venue}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C8A24A]/10 px-3 py-1 text-xs font-medium text-[#A68832]">
                  <LockIcon className="size-3.5" />
                  {t.note}
                </span>
              </div>

              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">{t.link}</p>
                <p className="break-all rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground select-all" dir="ltr">
                  {`/invites/${inv.slug}`}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(inv.slug, inv.path)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#C8A24A]"
                >
                  {copiedSlug === inv.slug ? <CheckIcon className="size-4 text-[#A68832]" /> : <CopyIcon className="size-4" />}
                  {copiedSlug === inv.slug ? t.copied : t.copy}
                </button>
                <a
                  href={inv.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#C8A24A]"
                >
                  <ExternalLinkIcon className="size-4" />
                  {t.open}
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewSlug(showing ? null : inv.slug)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    showing ? "bg-[#C8A24A] text-white" : "border border-border text-foreground hover:border-[#C8A24A]"
                  )}
                >
                  <EyeIcon className="size-4" />
                  {showing ? t.hidePreview : t.preview}
                </button>
              </div>

              {showing && (
                <div className="mt-4 flex justify-center">
                  <iframe
                    src={inv.path}
                    title={inv.title[language]}
                    className="h-[640px] w-full max-w-[360px] rounded-2xl border border-border"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
