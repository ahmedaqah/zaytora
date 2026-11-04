"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, HeartIcon, UserIcon } from "@/components/icons";
import {
  deletePrivateInviteRsvp,
  listMyPrivateInvites,
  listPrivateInviteRsvps,
  type OwnedPrivateInviteDto,
} from "@/lib/services/privateInvites.service";
import { RsvpResponsesModal } from "./RsvpResponsesModal";

// Invitations an admin handed over to this account (hand-made ones from the invite builder). The customer can open
// and share the link and follow the answers, but there is deliberately no edit button: only an admin edits them.
const COPY = {
  ar: {
    title: "دعواتي الخاصة",
    subtitle: "دعوات صُمّمت لك. يمكنك مشاركتها ومعاينتها ومتابعة الحضور والردود.",
    preview: "معاينة",
    copy: "نسخ الرابط",
    copied: "تم النسخ",
    responses: "الردود",
    attending: "الحضور",
    declined: "اعتذار",
    replies: "رد",
    whatsappMode: "تأكيد الحضور يصلك عبر واتساب",
    paused: "متوقفة مؤقتاً",
  },
  en: {
    title: "My private invitations",
    subtitle: "Invitations designed for you. Share them, preview them and follow the guests' answers.",
    preview: "Preview",
    copy: "Copy link",
    copied: "Copied",
    responses: "Responses",
    attending: "Attending",
    declined: "Declined",
    replies: "replies",
    whatsappMode: "RSVPs reach you on WhatsApp",
    paused: "Paused",
  },
};

export function PrivateInvitesSection({ language }: { language: "ar" | "en" }) {
  const t = COPY[language];
  const [rows, setRows] = useState<OwnedPrivateInviteDto[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyPrivateInvites()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        // not signed in / network: the section simply stays hidden
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copy(row: OwnedPrivateInviteDto) {
    try {
      await navigator.clipboard.writeText(row.url);
      setCopiedSlug(row.slug);
      setTimeout(() => setCopiedSlug((s) => (s === row.slug ? null : s)), 2000);
    } catch {
      // clipboard blocked: the link can still be opened from the preview button
    }
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-semibold text-foreground">{t.title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t.subtitle}</p>
      </div>

      {rows.map((row) => {
        const names = [row.name1, row.name2].filter(Boolean).join(" & ") || row.title;
        return (
          <div key={row.slug} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{names}</p>
                {row.dateText && <p className="mt-0.5 text-xs text-muted-foreground">{row.dateText}</p>}
                {row.isPaused && (
                  <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    {t.paused}
                  </span>
                )}
              </div>
              {row.siteRsvp ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <UserIcon className="size-3" />
                    {t.attending}: {row.attendingCount}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                    {t.declined}: {row.declinedCount}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{t.whatsappMode}</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold"
              >
                <EyeIcon className="size-4" />
                {t.preview}
              </a>
              <button
                type="button"
                onClick={() => copy(row)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold"
              >
                {copiedSlug === row.slug ? <CheckIcon className="size-4 text-gold" /> : <CopyIcon className="size-4" />}
                {copiedSlug === row.slug ? t.copied : t.copy}
              </button>
              {row.siteRsvp && (
                <button
                  type="button"
                  onClick={() => setOpenSlug(row.slug)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gold/90"
                >
                  <HeartIcon className="size-4" />
                  {t.responses} ({row.responsesCount})
                </button>
              )}
            </div>
          </div>
        );
      })}

      <RsvpResponsesModal
        invitationId={openSlug}
        language={language}
        onClose={() => setOpenSlug(null)}
        loadResponses={listPrivateInviteRsvps}
        removeRemote={deletePrivateInviteRsvp}
      />
    </div>
  );
}
