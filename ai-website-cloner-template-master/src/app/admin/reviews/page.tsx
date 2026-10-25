"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, EyeIcon, LoaderIcon, SearchIcon, StarIcon, TrashIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import { listReviews, approveReview, rejectReview, deleteReview } from "@/lib/services/reviews.service";
import { StatusBadge, type StatusTone } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { ReviewDetailsModal } from "@/components/admin/ReviewDetailsModal";
import type { ReviewDto, ReviewStatus } from "@/types/api";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_TONE: Record<ReviewStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const COPY = {
  ar: {
    subtitle: "راجع تقييمات العملاء ووافق على ما يُنشر على الموقع الرئيسي.",
    all: "الكل",
    statusLabels: { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" } as Record<ReviewStatus, string>,
    searchPlaceholder: "ابحث بالاسم أو النص أو الدولة...",
    customer: "اسم العميل",
    rating: "التقييم",
    titleText: "العنوان / النص",
    country: "الدولة",
    date: "التاريخ",
    status: "الحالة",
    actions: "الإجراءات",
    approve: "موافقة",
    hideOrDelete: "إخفاء/حذف",
    viewDetails: "عرض التفاصيل",
    empty: "لا توجد تقييمات مطابقة.",
    totalReviews: "إجمالي التقييمات",
    pendingReviews: "قيد المراجعة",
  },
  en: {
    subtitle: "Review customer feedback and approve what appears on the public site.",
    all: "All",
    statusLabels: { pending: "Pending", approved: "Approved", rejected: "Rejected" } as Record<ReviewStatus, string>,
    searchPlaceholder: "Search name, text, or country...",
    customer: "Customer Name",
    rating: "Rating",
    titleText: "Title / Text",
    country: "Country",
    date: "Date",
    status: "Status",
    actions: "Actions",
    approve: "Approve",
    hideOrDelete: "Hide/Delete",
    viewDetails: "View details",
    empty: "No matching reviews.",
    totalReviews: "Total reviews",
    pendingReviews: "Pending",
  },
};

function formatDate(iso: string, language: "ar" | "en") {
  return new Date(iso).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StarRow({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon
          key={index}
          className={cn("size-3.5", index < count ? "text-[#C8A24A]" : "text-muted-foreground")}
          fill={index < count ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    try {
      const [pageData, pendingData] = await Promise.all([
        listReviews({ status: statusFilter, search, page, pageSize: PAGE_SIZE }),
        listReviews({ status: "pending", pageSize: 1 }),
      ]);
      // Discard if a newer load() (e.g. filter changed again) already won.
      if (loadRequestIdRef.current !== requestId) return;
      setReviews(pageData.items);
      setTotalCount(pageData.totalCount);
      setPendingCount(pendingData.totalCount);
    } catch (error) {
      console.error("[admin/reviews] failed to load reviews:", error);
    } finally {
      if (loadRequestIdRef.current === requestId) setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const viewingReview = reviews.find((review) => review.id === viewingId) ?? null;

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      const updated = await approveReview(id);
      setReviews((current) => current.map((r) => (r.id === id ? updated : r)));
      setPendingCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("[admin/reviews] failed to approve review:", error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      const updated = await rejectReview(id);
      setReviews((current) => current.map((r) => (r.id === id ? updated : r)));
      setPendingCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("[admin/reviews] failed to reject review:", error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteReview(id);
      setViewingId(null);
      await load();
    } catch (error) {
      console.error("[admin/reviews] failed to delete review:", error);
    } finally {
      setBusyId(null);
    }
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-foreground" dir="ltr">
            {totalCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t.totalReviews}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-foreground" dir="ltr">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t.pendingReviews}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                statusFilter === key
                  ? "border-transparent bg-[#C8A24A] text-white"
                  : "border-border bg-card text-body-foreground hover:border-white/20"
              )}
            >
              {key === "all" ? t.all : t.statusLabels[key]}
            </button>
          ))}
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-full border border-border bg-card py-2 ps-9 pe-4 text-sm text-body-foreground outline-none transition-colors focus:border-[#C8A24A] sm:w-72"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        {reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] table-fixed text-start text-sm">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[25%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[21%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t.customer}</th>
                  <th className="py-2 text-start font-medium">{t.rating}</th>
                  <th className="py-2 text-start font-medium">{t.titleText}</th>
                  <th className="py-2 text-start font-medium">{t.country}</th>
                  <th className="py-2 text-start font-medium">{t.date}</th>
                  <th className="py-2 text-center font-medium">{t.status}</th>
                  <th className="py-2 text-start font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-b border-border last:border-0">
                    <td className="py-3 pe-4 font-medium text-foreground">
                      <span className="block truncate" title={review.name}>
                        {review.name}
                      </span>
                    </td>
                    <td className="py-3 pe-3">
                      <StarRow count={review.rating} />
                    </td>
                    <td className="py-3 pe-4 text-body-foreground">
                      <span
                        className="block truncate font-medium text-foreground"
                        title={review.title ? `${review.title} — ${review.body}` : review.body}
                      >
                        {review.title || review.body}
                      </span>
                    </td>
                    <td className="py-3 pe-3 text-body-foreground">
                      <span className="block truncate">
                        {review.countryFlag} {review.country}
                      </span>
                    </td>
                    <td className="py-3 pe-3 text-muted-foreground">{formatDate(review.submittedAt, language)}</td>
                    <td className="py-3 text-center">
                      <StatusBadge tone={STATUS_TONE[review.status]}>{t.statusLabels[review.status]}</StatusBadge>
                    </td>
                    <td className="py-3">
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingId(review.id)}
                          aria-label={t.viewDetails}
                          title={t.viewDetails}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/10 hover:text-foreground"
                        >
                          <EyeIcon className="size-4" />
                        </button>
                        {review.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(review.id)}
                            disabled={busyId === review.id}
                            className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/50 disabled:opacity-50"
                          >
                            {busyId === review.id ? (
                              <LoaderIcon className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircleIcon className="size-3.5" />
                            )}
                            {t.approve}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(review.id)}
                          disabled={busyId === review.id}
                          aria-label={t.hideOrDelete}
                          title={t.hideOrDelete}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400 disabled:opacity-50"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="contents">
            <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} language={language} />
          </div>
        )}
      </div>

      <ReviewDetailsModal
        review={viewingReview}
        language={language}
        onClose={() => setViewingId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
      />
    </div>
  );
}
