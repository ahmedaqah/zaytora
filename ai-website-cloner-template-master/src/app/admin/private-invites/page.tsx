"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  LoaderIcon,
  LockIcon,
  PenLineIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { deletePrivateInvite, listPrivateInvites, type PrivateInviteDto } from "@/lib/services/privateInvites.service";

// Two kinds of private invitation are listed here, both unlisted: not linked from the
// public site, disallowed in robots.ts and noindex in their own <head>. Anyone holding the
// link (the guests) can open them, so this page is the only place they are listed and managed.
//  - hand-built static pages served from /public/invites/<slug>/ (the list below), and
//  - invitations created in the Invite Builder, saved in the database and served at
//    /invites/p/<slug> (loaded from the API, editable and deletable here).
type PrivateInvite = {
  slug: string;
  path: string;
  editable?: boolean;
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
    create: "إنشاء دعوة جديدة",
    edit: "تعديل",
    remove: "حذف",
    confirmRemove: "حذف هذه الدعوة نهائياً؟ سيتوقف رابطها عن العمل.",
    loading: "جاري التحميل…",
    loadError: "تعذّر تحميل الدعوات المحفوظة.",
    deleteError: "تعذّر حذف الدعوة.",
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
    create: "Create new invitation",
    edit: "Edit",
    remove: "Delete",
    confirmRemove: "Delete this invitation permanently? Its link will stop working.",
    loading: "Loading…",
    loadError: "Could not load the saved invitations.",
    deleteError: "Could not delete the invitation.",
  },
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// "2027-05-20T19:00" -> "20/05/2027"
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function formatRange(start: string, end: string): string {
  const s = /T(\d{2}:\d{2})/.exec(start)?.[1];
  const e = /T(\d{2}:\d{2})/.exec(end)?.[1];
  return s && e ? `${s} – ${e}` : (s ?? "");
}

function fromDto(dto: PrivateInviteDto): PrivateInvite {
  const event = asRecord(dto.config.event);
  const time = formatRange(str(event.start), str(event.end));
  return {
    slug: dto.slug,
    path: `/invites/p/${dto.slug}`,
    editable: true,
    title: { ar: dto.title, en: dto.title },
    date: formatDate(str(event.start)),
    time: { ar: time, en: time },
    venue: str(asRecord(dto.config.location).venue),
  };
}

export default function AdminPrivateInvitesPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [saved, setSaved] = useState<PrivateInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPrivateInvites()
      .then((rows) => {
        if (!cancelled) setSaved(rows.map(fromDto));
      })
      .catch(() => {
        if (!cancelled) setError(t.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t.loadError]);

  async function remove(slug: string) {
    if (!window.confirm(t.confirmRemove)) return;
    try {
      await deletePrivateInvite(slug);
      setSaved((rows) => rows.filter((r) => r.slug !== slug));
    } catch {
      setError(t.deleteError);
    }
  }

  const invites = [...saved, ...PRIVATE_INVITES];

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <Link
          href="/admin/invite-builder"
          className="inline-flex items-center gap-2 rounded-xl bg-[#C8A24A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <PlusIcon className="size-4" />
          {t.create}
        </Link>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          {t.loading}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && invites.length === 0 && <p className="text-sm text-muted-foreground">{t.empty}</p>}

      <ul className="space-y-4">
        {invites.map((inv) => {
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
                  {inv.path}
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
                {inv.editable && (
                  <>
                    <Link
                      href={`/admin/invite-builder?edit=${encodeURIComponent(inv.slug)}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#C8A24A]"
                    >
                      <PenLineIcon className="size-4" />
                      {t.edit}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(inv.slug)}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-destructive transition-colors hover:border-destructive"
                    >
                      <TrashIcon className="size-4" />
                      {t.remove}
                    </button>
                  </>
                )}
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
