"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ClipboardListIcon,
  CopyIcon,
  EyeIcon,
  HandshakeIcon,
  HeartIcon,
  ImageIcon,
  LoaderIcon,
  MailIcon,
  PenLineIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  createInvitationTransferLink,
  deleteInvitation,
  getInvitation,
  listInvitations,
  updateInvitation,
} from "@/lib/services/invitations.service";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { RsvpResponsesModal } from "./RsvpResponsesModal";
import { GalleryModal } from "./GalleryModal";

interface BookingRow {
  id: string;
  bookingId: string;
  bookingDate: string;
  eventDate: string | null;
  responses: number;
  galleryCount: number;
  names: string;
  // Only "paid"/"shared" invitations are visible to guests via the public
  // link — everything else is still a draft awaiting admin approval, so the
  // dashboard flags it rather than implying it's already shareable.
  isPaid: boolean;
  // A pending order still awaiting the admin's manual bank-transfer
  // confirmation -- deleting this draft now would orphan that order (its
  // InvitationId gets nulled out server-side), so the delete dialog warns
  // first instead of silently losing the admin's ability to review it.
  hasPendingOrder: boolean;
}

const DEMO_USER = {
  email: "guest@zaytorainvites.com",
  phone: "+966 5X XXX XXXX",
  userId: "#U-VEWRGC",
};

const COPY = {
  ar: {
    title: "دعواتي",
    subtitle: "إدارة وتتبع جميع دعواتك الرقمية",
    createNew: "إنشاء جديد",
    userId: "المعرّف",
    stats: { total: "الإجمالي", upcoming: "قادمة", responses: "الردود" },
    searchPlaceholder: "ابحث في الدعوات...",
    tableTitle: "الحجوزات",
    responsesCount: (n: number) => `${n} ${n === 1 ? "رد" : "ردود"}`,
    galleryCount: (n: number) => `${n} ${n === 1 ? "صورة" : "صور"}`,
    actionLabels: {
      preview: "معاينة",
      edit: "تعديل",
      gallery: "الصور والمعرض",
      delete: "حذف",
      copyLink: "نسخ رابط الدعوة",
      linkCopied: "تم نسخ الرابط",
      handoff: "توليد رابط تسليم للزبون",
      handoffCopied: "تم نسخ رابط التسليم",
      handoffError: "تعذّر توليد رابط التسليم",
    },
    copyLinkPendingHint: "الرابط بيشتغل بس بعد موافقة الأدمن على الدعوة",
    draftBadge: "مسودة، بانتظار المراجعة",
    emptyState: "لا توجد دعوات مطابقة",
    noInvitationsYet: "لا توجد دعوات بعد.",
    createFirstLink: "ابدأ بإنشاء دعوتك الأولى",
    noDate: "—",
    untitled: "دعوة بدون اسم",
    guestPrompt: "دعواتك محفوظة على هذا الجهاز فقط.",
    guestLink: "أنشئ حساباً لحفظها بشكل دائم",
    partnerProfile: "ملف الشراكة",
    noPhone: "لا يوجد رقم مسجّل",
  },
  en: {
    title: "My Invitations",
    subtitle: "Manage and track all your digital invitations",
    createNew: "Create New",
    userId: "User ID",
    stats: { total: "Total", upcoming: "Upcoming", responses: "Responses" },
    searchPlaceholder: "Search invitations...",
    tableTitle: "Bookings",
    responsesCount: (n: number) => `${n} response${n === 1 ? "" : "s"}`,
    galleryCount: (n: number) => `${n} photo${n === 1 ? "" : "s"}`,
    actionLabels: {
      preview: "Preview",
      edit: "Edit",
      gallery: "Gallery & photos",
      delete: "Delete",
      copyLink: "Copy invitation link",
      linkCopied: "Link copied",
      handoff: "Generate handoff link for customer",
      handoffCopied: "Handoff link copied",
      handoffError: "Couldn't generate the handoff link",
    },
    copyLinkPendingHint: "The link only works once an admin approves this invitation",
    draftBadge: "Draft, awaiting review",
    emptyState: "No matching invitations",
    noInvitationsYet: "No invitations yet.",
    createFirstLink: "Start creating your first invitation",
    noDate: "—",
    untitled: "Untitled invitation",
    guestPrompt: "Your invitations are only saved on this device.",
    guestLink: "Create an account to keep them permanently",
    partnerProfile: "Partner profile",
    noPhone: "No phone number on file",
  },
};

function formatDate(iso: string | null, language: "ar" | "en", placeholder: string) {
  if (!iso) return placeholder;
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

// Warm stone/gold glass card — the same "no template photo" glass treatment
// InvitationCanvas uses on its own cards (rounded-3xl, cream-tinted border,
// soft ambient shadow), applied here so the dashboard reads as part of the
// same premium theme instead of a generic cold-grey admin panel.
const GLASS_CARD =
  "rounded-3xl border border-border bg-card/80 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md";

function fadeUp(index: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: index * 0.05, ease: "easeOut" as const },
  };
}

const listReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

function StatCard({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: typeof ClipboardListIcon;
  label: string;
  // null while the real count is still loading, so this never flashes a
  // believable-but-wrong "0" right before the real number replaces it.
  value: number | null;
  index: number;
}) {
  return (
    <motion.div {...fadeUp(index)} className={cn("flex items-center gap-3 p-4", GLASS_CARD)}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

// A stacked card — not a table row — for each booking, so the list reflows
// naturally on a phone-width screen instead of forcing horizontal scroll on
// a min-w-[720px] table (the previous implementation), matching this app's
// mobile-first structure.
function BookingCard({
  booking,
  language,
  t,
  index,
  linkCopied,
  isAdmin,
  handoffState,
  onPreview,
  onDelete,
  onOpenResponses,
  onOpenGallery,
  onCopyLink,
  onHandoff,
}: {
  booking: BookingRow;
  language: "ar" | "en";
  t: (typeof COPY)["ar"];
  index: number;
  // Whether *this* card's link was the most recently copied one — drives
  // the brief checkmark feedback, not a per-card toggle of its own.
  linkCopied: boolean;
  // Every invitation on this dashboard already belongs to whoever's
  // viewing it -- so when that's an admin, every card here is a candidate
  // for the "hand off to the customer's own account" action below (see
  // InvitationsController.CreateTransferLink's own admin-owned check).
  isAdmin: boolean;
  handoffState: "idle" | "loading" | "copied" | "error";
  onPreview: (row: BookingRow) => void;
  onDelete: (row: BookingRow) => void;
  onOpenResponses: (row: BookingRow) => void;
  onOpenGallery: (row: BookingRow) => void;
  onCopyLink: (row: BookingRow) => void;
  onHandoff: (row: BookingRow) => void;
}) {
  return (
    <motion.div
      {...listReveal}
      transition={{ ...listReveal.transition, delay: Math.min(index, 6) * 0.05 }}
      className={cn("p-5", GLASS_CARD)}
    >
      <div>
        <p className="flex items-center gap-2 font-semibold text-foreground">
          {booking.bookingId}
          {!booking.isPaid && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {t.draftBadge}
            </span>
          )}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarIcon className="size-3.5 text-gold" />
          {formatDate(booking.eventDate, language, t.noDate)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => onOpenResponses(booking)}
          className="flex items-center gap-1.5 rounded-full transition-colors hover:text-gold"
        >
          <HeartIcon className="size-3.5 text-gold/70" />
          {t.responsesCount(booking.responses)}
        </button>
        <button
          type="button"
          onClick={() => onOpenGallery(booking)}
          className="flex items-center gap-1.5 rounded-full transition-colors hover:text-gold"
        >
          <ImageIcon className="size-3.5 text-gold/70" />
          {t.galleryCount(booking.galleryCount)}
        </button>
        <span>{formatDate(booking.bookingDate, language, t.noDate)}</span>
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => booking.isPaid && onCopyLink(booking)}
          disabled={!booking.isPaid}
          aria-label={!booking.isPaid ? t.copyLinkPendingHint : linkCopied ? t.actionLabels.linkCopied : t.actionLabels.copyLink}
          title={!booking.isPaid ? t.copyLinkPendingHint : linkCopied ? t.actionLabels.linkCopied : t.actionLabels.copyLink}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-colors",
            !booking.isPaid
              ? "cursor-not-allowed text-muted-foreground/40"
              : linkCopied
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground hover:bg-gold/10 hover:text-gold"
          )}
        >
          {linkCopied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => onPreview(booking)}
          aria-label={t.actionLabels.preview}
          title={t.actionLabels.preview}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold"
        >
          <EyeIcon className="size-4" />
        </button>
        <Link
          href={`/studio?invitationId=${booking.id}`}
          aria-label={t.actionLabels.edit}
          title={t.actionLabels.edit}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold"
        >
          <PenLineIcon className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => onOpenGallery(booking)}
          aria-label={t.actionLabels.gallery}
          title={t.actionLabels.gallery}
          className="flex size-9 items-center justify-center rounded-full text-purple-700 dark:text-purple-400 transition-colors hover:bg-purple-100 dark:bg-purple-950/50"
        >
          <CameraIcon className="size-4" />
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onHandoff(booking)}
            disabled={handoffState === "loading"}
            aria-label={
              handoffState === "error"
                ? t.actionLabels.handoffError
                : handoffState === "copied"
                  ? t.actionLabels.handoffCopied
                  : t.actionLabels.handoff
            }
            title={
              handoffState === "error"
                ? t.actionLabels.handoffError
                : handoffState === "copied"
                  ? t.actionLabels.handoffCopied
                  : t.actionLabels.handoff
            }
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-colors",
              handoffState === "error"
                ? "text-rose-700 dark:text-rose-400"
                : handoffState === "copied"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground hover:bg-gold/10 hover:text-gold"
            )}
          >
            {handoffState === "loading" ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : handoffState === "copied" ? (
              <CheckIcon className="size-4" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(booking)}
          aria-label={t.actionLabels.delete}
          title={t.actionLabels.delete}
          className="ms-auto flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function DashboardView() {
  const { language } = useLanguage();
  const t = COPY[language];
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BookingRow | null>(null);
  const [responsesRow, setResponsesRow] = useState<BookingRow | null>(null);
  const [galleryRow, setGalleryRow] = useState<BookingRow | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const galleryRequestIdRef = useRef(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<"loading" | "copied" | "error">("loading");

  const loadBookings = useCallback(async () => {
    // Works whether the caller is signed in (by UserId) or anonymous (by
    // the GuestId tracking cookie) — GET /api/invitations supports both, so
    // guests see their own real invitations here too.
    setBookingsLoading(true);
    try {
      const summaries = await listInvitations();
      setBookings(
        summaries.map((s) => ({
          id: s.id,
          bookingId: s.bookingId,
          bookingDate: s.createdAt,
          eventDate: s.eventDateTime ?? null,
          responses: s.responseCount,
          galleryCount: s.galleryCount,
          names: [s.firstName, s.secondName].filter(Boolean).join(" & ") || t.untitled,
          isPaid: s.isPaid,
          hasPendingOrder: s.hasPendingOrder,
        }))
      );
    } catch (error) {
      console.error("[dashboard] failed to load invitations:", error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadBookings();
  }, [authLoading, loadBookings]);

  // DEMO_USER is only for a confirmed guest (auth check finished and there's
  // genuinely no user) — while authLoading, `user` is null too, but that's
  // not the same thing: showing DEMO_USER's fake email/id in that gap once
  // looked like real (but wrong) account data flashing before the actual one
  // loaded, right when a customer who just paid would be most alarmed by it.
  const email = authLoading ? null : user?.email || DEMO_USER.email;
  // Only fall back to the fake demo phone when there's no real user at all
  // (guest/demo mode) — a signed-in user who simply never entered a phone
  // number must never see that placeholder rendered as if it were theirs.
  const phone = authLoading ? null : user ? user.phoneNumber || t.noPhone : DEMO_USER.phone;
  const userId = authLoading ? null : user ? `#U-${user.id.slice(0, 6).toUpperCase()}` : DEMO_USER.userId;
  const loading = authLoading || bookingsLoading;

  const stats = useMemo(
    () => ({
      total: bookings.length,
      upcoming: bookings.filter((b) => b.eventDate && new Date(b.eventDate) > new Date()).length,
      responses: bookings.reduce((sum, b) => sum + b.responses, 0),
    }),
    [bookings]
  );

  const visibleBookings = useMemo(() => {
    return bookings.filter((b) => b.bookingId.toLowerCase().includes(query.trim().toLowerCase()));
  }, [bookings, query]);

  async function confirmDelete() {
    const row = deleteTarget;
    if (!row) return;
    setDeleteTarget(null);

    try {
      await deleteInvitation(row.id);
    } catch (error) {
      console.error("[dashboard] failed to delete invitation:", error);
      return;
    }
    setBookings((current) => current.filter((b) => b.id !== row.id));
  }

  async function addPhotos(row: BookingRow, files: FileList | null) {
    if (!files || files.length === 0) return;

    try {
      const dataUrls = await Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            })
        )
      );

      const current = await getInvitation(row.id);
      const merged = [...current.galleryImages, ...dataUrls];
      await updateInvitation(row.id, { galleryImages: merged });

      setBookings((rows) => rows.map((b) => (b.id === row.id ? { ...b, galleryCount: merged.length } : b)));
      setGalleryImages(merged);
    } catch (error) {
      console.error("[dashboard] failed to upload photos:", error);
    }
  }

  async function removePhoto(row: BookingRow, index: number) {
    const remaining = galleryImages.filter((_, i) => i !== index);
    try {
      await updateInvitation(row.id, { galleryImages: remaining });
      setBookings((rows) => rows.map((b) => (b.id === row.id ? { ...b, galleryCount: remaining.length } : b)));
      setGalleryImages(remaining);
    } catch (error) {
      console.error("[dashboard] failed to remove photo:", error);
    }
  }

  // The real guest-facing link — no `&preview=true` (that flag watermarks
  // the page and makes RSVP/etc. read-only, see PublicInvitationView.tsx).
  // Every invitation reaching this dashboard is already admin-approved (see
  // InvitationsController.List's gating), so this link works for anyone the
  // instant it's shared.
  function copyLink(row: BookingRow) {
    const url = `${window.location.origin}/invitationpublic?id=${row.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(row.id);
    window.setTimeout(() => setCopiedId((current) => (current === row.id ? null : current)), 2000);
  }

  // Admin-only (see BookingCard's own isAdmin gate) -- generates a one-time
  // link an admin can send a customer so the invitation the admin designed
  // for them ends up owned by the customer's own account, not the admin's.
  async function handleHandoff(row: BookingRow) {
    setHandoffId(row.id);
    setHandoffStatus("loading");
    try {
      const { url } = await createInvitationTransferLink(row.id);
      await navigator.clipboard.writeText(url).catch(() => {});
      setHandoffStatus("copied");
    } catch (error) {
      console.error("[dashboard] failed to create a transfer link:", error);
      setHandoffStatus("error");
    } finally {
      window.setTimeout(() => setHandoffId((current) => (current === row.id ? null : current)), 2500);
    }
  }

  function openPreview(row: BookingRow) {
    // Same standalone full-page route (with the same real-data-vs-mock
    // switch) that the templates grid's "Preview" button and the studio's
    // own "فتح المعاينة الكاملة" button already use — just pointed at this
    // invitation's real id instead of a template code, so it renders the
    // guest's actual entered content rather than demo data.
    window.open(`/invitationpublic?id=${row.id}&preview=true`, "_blank");
  }

  async function openGallery(row: BookingRow) {
    setGalleryRow(row);
    const requestId = ++galleryRequestIdRef.current;
    try {
      const detail = await getInvitation(row.id);
      // Guards against a fast click on a different booking's gallery icon
      // resolving out of order — without this, an earlier, slower request
      // could land after a later one and overwrite the modal (now showing
      // a different booking) with the wrong booking's photos.
      if (galleryRequestIdRef.current !== requestId) return;
      setGalleryImages(detail.galleryImages);
    } catch (error) {
      console.error("[dashboard] failed to load gallery:", error);
      if (galleryRequestIdRef.current === requestId) setGalleryImages([]);
    }
  }

  return (
    <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-2xl font-semibold text-foreground">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/dashboard/partner"
              className="flex items-center gap-1.5 rounded-full border border-border bg-background/5 px-4 py-2.5 text-sm font-medium text-body-foreground backdrop-blur-md transition-colors hover:bg-background/10"
            >
              <HandshakeIcon className="size-4 text-gold" />
              {t.partnerProfile}
            </Link>
          )}
          <Link
            href="/studio"
            className="flex items-center gap-1.5 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(200,162,74,0.35)] transition-colors hover:bg-gold/90"
          >
            + {t.createNew}
          </Link>
        </div>
      </div>

      {/* User info banner */}
      <div className={cn("flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-4 text-sm text-body-foreground", GLASS_CARD)}>
        <span className="flex items-center gap-1.5">
          <MailIcon className="size-4 text-gold" />
          <span dir="ltr">{email ?? "…"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <PhoneIcon className="size-4 text-gold" />
          {user && !user.phoneNumber ? (
            <Link href="/account" className="text-gold underline-offset-2 hover:underline">
              {phone}
            </Link>
          ) : (
            <span dir="ltr">{phone ?? "…"}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <UserIcon className="size-4 text-gold" />
          {t.userId}: <span dir="ltr">{userId ?? "…"}</span>
        </span>
        {loading && <LoaderIcon className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {!loading && !user && (
        <p className="-mt-3 text-xs text-muted-foreground">
          {t.guestPrompt}{" "}
          <Link href="/login" className="font-medium text-gold hover:underline">
            {t.guestLink}
          </Link>
        </p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ClipboardListIcon} label={t.stats.total} value={loading ? null : stats.total} index={0} />
        <StatCard icon={CheckIcon} label={t.stats.upcoming} value={loading ? null : stats.upcoming} index={1} />
        <StatCard icon={HeartIcon} label={t.stats.responses} value={loading ? null : stats.responses} index={2} />
      </div>

      {/* Search */}
      <div className="flex justify-end">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-full border border-border bg-background/5 py-2.5 ps-9 pe-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
          />
        </div>
      </div>

      {/* Bookings — a stacked card list (not a table) so it reflows cleanly
          on a phone-width screen instead of forcing horizontal scroll. */}
      <div className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-foreground">{t.tableTitle}</h2>

        {visibleBookings.map((booking, index) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            language={language}
            t={t}
            index={index}
            linkCopied={copiedId === booking.id}
            isAdmin={user?.isAdmin ?? false}
            handoffState={handoffId === booking.id ? handoffStatus : "idle"}
            onPreview={openPreview}
            onDelete={setDeleteTarget}
            onOpenResponses={setResponsesRow}
            onOpenGallery={openGallery}
            onCopyLink={copyLink}
            onHandoff={handleHandoff}
          />
        ))}

        {!loading && visibleBookings.length === 0 && (
          <div className={cn("px-5 py-10 text-center text-sm text-muted-foreground", GLASS_CARD)}>
            {bookings.length === 0 ? (
              <>
                {t.noInvitationsYet}{" "}
                <Link href="/studio" className="font-medium text-gold hover:underline">
                  {t.createFirstLink}
                </Link>
              </>
            ) : (
              t.emptyState
            )}
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        names={deleteTarget?.names ?? ""}
        hasPendingOrder={deleteTarget?.hasPendingOrder ?? false}
        language={language}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <RsvpResponsesModal
        invitationId={responsesRow?.id ?? null}
        language={language}
        onClose={() => setResponsesRow(null)}
      />

      <GalleryModal
        open={Boolean(galleryRow)}
        invitationId={galleryRow?.id ?? null}
        images={galleryImages}
        language={language}
        onClose={() => setGalleryRow(null)}
        onAddPhotos={(files) => galleryRow && addPhotos(galleryRow, files)}
        onRemovePhoto={(index) => galleryRow && removePhoto(galleryRow, index)}
      />
    </div>
    </div>
  );
}
