"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoaderIcon } from "@/components/icons";
import { getInvitation } from "@/lib/services/invitations.service";
import { getTemplates } from "@/lib/services/templates.service";
import { buildMockInvitation } from "@/lib/mockInvitation";
import type { InvitationDetail } from "@/types/studio";
import { InvitationCanvas } from "@/components/studio/phone-preview/InvitationCanvas";

// The guest-facing, standalone equivalent of numinds.me/invitationpublic — a
// real navigable page: full native page scroll inside a max-w-[393px]
// centered column, with InvitationCanvas's nav/modals anchored to the
// viewport via variant="standalone".
//
// Three distinct callers feed this page real vs. demo data, all via
// window.open(..., "_blank"):
// - Studio Step 18 ("فتح المعاينة الكاملة") and the dashboard's per-booking
//   preview button both pass ?id=<invitationId>&preview=true — the actual
//   entered data for that draft/booking, watermarked as a preview.
// - The Home page / templates grid "Preview" button passes
//   ?template=<templateCode> — no real invitation exists yet, so the canvas
//   renders a fully-populated mock invitation for that template instead,
//   with no preview watermark (matching numinds.me's template-preview flow).
export function PublicInvitationView() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const templateCode = searchParams.get("template");
  const isPreview = searchParams.get("preview") === "true";

  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getInvitation(id)
      .then((detail) => {
        if (!cancelled) setInvitation(detail);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (id || !templateCode) return;
    let cancelled = false;
    getTemplates()
      .then((templates) => {
        if (cancelled) return;
        const match = templates.find((tpl) => tpl.code.toLowerCase() === templateCode.toLowerCase());
        setInvitation(buildMockInvitation(match?.id ?? null, match?.category ?? null));
      })
      .catch(() => {
        if (!cancelled) setInvitation(buildMockInvitation(null));
      });
    return () => {
      cancelled = true;
    };
  }, [id, templateCode]);

  if ((!id && !templateCode) || notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white px-6 text-center" dir="rtl">
        <p className="text-base font-medium text-gray-900">لم يتم العثور على هذه الدعوة</p>
        <p className="text-sm text-gray-500">This invitation could not be found.</p>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-400">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative mx-auto w-full max-w-[393px] overflow-x-clip">
        {isPreview && (
          <div className="absolute left-1/2 top-6 z-40 -translate-x-1/2 rounded-full border border-gray-200 bg-white/75 px-6 py-2 shadow-sm backdrop-blur-md">
            <span className="text-sm font-medium text-gray-700">معاينة غير نهائية</span>
          </div>
        )}

        <InvitationCanvas value={invitation} variant="standalone" readOnly={isPreview || !id} />

        {isPreview && (
          // A tiled, low-opacity diagonal stamp (like a stock-photo preview
          // watermark) rather than one giant centered word — that earlier
          // version was `fixed inset-0`, so it stayed pinned to the viewport
          // center no matter how far the guest scrolled, permanently blocking
          // the view of whatever content was underneath instead of just
          // marking the page as a preview.
          //
          // Lives inside this `relative` wrapper (sized by InvitationCanvas's
          // full height), not as a sibling of it — an `absolute inset-0` on
          // an unpositioned ancestor sizes against the viewport instead of
          // the full scrollable card, so it used to fade out below the fold.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40 select-none overflow-hidden"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-35deg, transparent 0, transparent 60px, rgba(0,0,0,0.09) 60px, rgba(0,0,0,0.09) 61px)",
            }}
          >
            <div
              className="absolute inset-0 grid grid-cols-2"
              style={{ gridAutoRows: "96px" }}
            >
              {/* 400 rather than a size just covering one screen — the card's
                full height varies a lot by which sections are enabled
                (gallery, guestbook, RSVP, gifts...), and undershooting here
                is exactly the bug this watermark just had. */}
            {Array.from({ length: 400 }).map((_, index) => {
                // Rows come in groups of 3 (each row = 2 cells, since
                // grid-cols-2) alternating "غير مدفوعة" / the domain, so a
                // stolen screen recording carries more "unpaid" lines than
                // plain branding lines.
                const row = Math.floor(index / 2);
                const label = Math.floor(row / 3) % 2 === 0 ? "غير مدفوعة" : "zaytorainvites.com";
                return (
                  <span
                    key={index}
                    className="flex -rotate-[35deg] items-center justify-center whitespace-nowrap text-xs font-bold tracking-[0.15em] text-black/30"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
