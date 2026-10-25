"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircleIcon, XCircleIcon, TicketIcon, EyeIcon, TrashIcon, LoaderIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  listPartners,
  approvePartner,
  rejectPartner,
  setPartnerActive,
  deletePartner,
} from "@/lib/services/partners.service";
import { formatUsd } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { PartnerDetailsModal } from "@/components/admin/PartnerDetailsModal";
import { PartnerDeleteDialog } from "@/components/admin/PartnerDeleteDialog";
import type { PartnerDto } from "@/types/api";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  eventPlanner: { ar: "منظم مناسبات", en: "Event Planner" },
  photographer: { ar: "مصور", en: "Photographer" },
  designer: { ar: "مصمم", en: "Designer" },
  other: { ar: "أخرى", en: "Other" },
};

const COPY = {
  ar: {
    subtitle: "راجع طلبات الشراكة الجديدة وأدر الشركاء المعتمدين.",
    pendingTitle: "الطلبات المعلقة",
    pendingEmpty: "لا توجد طلبات معلقة حالياً.",
    approvedTitle: "الشركاء المعتمدون",
    approvedEmpty: "لا يوجد شركاء معتمدون مطابقون.",
    searchPlaceholder: "ابحث بالاسم أو البريد أو كود الشريك...",
    business: "النشاط التجاري",
    applicant: "مقدّم الطلب",
    category: "الفئة",
    country: "الدولة",
    submitted: "تاريخ التقديم",
    actions: "الإجراءات",
    approve: "قبول",
    reject: "رفض",
    promoCode: "كود الشريك",
    usage: "مرات الاستخدام",
    revenue: "الإيرادات المحققة",
    justApproved: (name: string, code: string) =>
      `تم اعتماد "${name}" — تم توليد الكود ${code} وإضافته إلى صفحة شركاؤنا.`,
    viewDetails: "عرض الملف",
    deletePartner: "حذف الشريك",
    activate: "تفعيل",
    deactivate: "إيقاف",
    paused: "متوقف",
  },
  en: {
    subtitle: "Review new partnership requests and manage approved partners.",
    pendingTitle: "Pending Requests",
    pendingEmpty: "No pending requests right now.",
    approvedTitle: "Approved Partners",
    approvedEmpty: "No matching approved partners.",
    searchPlaceholder: "Search name, email, or promo code...",
    business: "Business",
    applicant: "Applicant",
    category: "Category",
    country: "Country",
    submitted: "Submitted",
    actions: "Actions",
    approve: "Approve",
    reject: "Reject",
    promoCode: "Promo code",
    usage: "Uses",
    revenue: "Revenue generated",
    justApproved: (name: string, code: string) =>
      `"${name}" approved — code ${code} generated and added to /OurPartners.`,
    viewDetails: "View profile",
    deletePartner: "Delete partner",
    activate: "Activate",
    deactivate: "Deactivate",
    paused: "Paused",
  },
};

function formatDate(iso: string, language: "ar" | "en") {
  return new Date(iso).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminPartnersPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [pending, setPending] = useState<PartnerDto[]>([]);
  const [approved, setApproved] = useState<PartnerDto[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState<{ name: string; code: string } | null>(null);
  const [viewingPartnerId, setViewingPartnerId] = useState<string | null>(null);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    try {
      // Pending stays a small, fully-visible review queue (no search/paging —
      // admin needs to see every new application). Approved is the section
      // that grows unbounded and gets server-side search + pagination.
      const [pendingData, approvedData] = await Promise.all([
        listPartners({ status: "pending", pageSize: 500 }),
        listPartners({ status: "approved", search, page, pageSize: PAGE_SIZE }),
      ]);
      // Discard if a newer load() (e.g. search changed again) already won.
      if (loadRequestIdRef.current !== requestId) return;
      setPending(pendingData.items);
      setApproved(approvedData.items);
      setApprovedTotal(approvedData.totalCount);
    } catch (error) {
      console.error("[admin/partners] failed to load partners:", error);
    } finally {
      if (loadRequestIdRef.current === requestId) setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const viewingPartner = [...pending, ...approved].find((p) => p.id === viewingPartnerId) ?? null;
  const deletingPartner = approved.find((p) => p.id === deletingPartnerId) ?? null;

  async function handleApprove(id: string, businessName: string) {
    setBusyId(id);
    try {
      const updated = await approvePartner(id);
      setPending((current) => current.filter((p) => p.id !== id));
      setJustApproved({ name: businessName, code: updated.promoCode ?? "" });
      await load();
    } catch (error) {
      console.error("[admin/partners] failed to approve partner:", error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectPartner(id);
      setPending((current) => current.filter((p) => p.id !== id));
    } catch (error) {
      console.error("[admin/partners] failed to reject partner:", error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetActive(id: string, active: boolean) {
    try {
      const updated = await setPartnerActive(id, active);
      setApproved((current) => current.map((p) => (p.id === id ? updated : p)));
    } catch (error) {
      console.error("[admin/partners] failed to toggle partner active state:", error);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingPartnerId) return;
    const id = deletingPartnerId;
    setDeletingPartnerId(null);
    try {
      await deletePartner(id);
      await load();
    } catch (error) {
      console.error("[admin/partners] failed to delete partner:", error);
    }
  }

  if (loading && pending.length === 0 && approved.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      {justApproved && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-100 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <TicketIcon className="mt-0.5 size-4 shrink-0" />
          {t.justApproved(justApproved.name, justApproved.code)}
        </div>
      )}

      {/* Pending requests */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <p className="mb-4 text-sm font-semibold text-foreground">
          {t.pendingTitle} <span className="text-muted-foreground">({pending.length})</span>
        </p>
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.pendingEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-start text-sm">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[24%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t.business}</th>
                  <th className="py-2 text-start font-medium">{t.applicant}</th>
                  <th className="py-2 text-start font-medium">{t.category}</th>
                  <th className="py-2 text-start font-medium">{t.country}</th>
                  <th className="py-2 text-start font-medium">{t.submitted}</th>
                  <th className="py-2 text-start font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((request) => (
                  <tr key={request.id} className="border-b border-border last:border-0">
                    <td className="py-3 pe-4 font-medium text-foreground">
                      <span className="block truncate" title={request.businessName}>
                        {request.businessName}
                      </span>
                    </td>
                    <td className="py-3 pe-4 text-body-foreground">
                      <span className="block truncate" title={request.applicantName}>
                        {request.applicantName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground" dir="ltr" title={request.email}>
                        {request.email}
                      </span>
                    </td>
                    <td className="py-3 pe-4 text-body-foreground">
                      <span className="block truncate">{CATEGORY_LABELS[request.category]?.[language] ?? request.category}</span>
                    </td>
                    <td className="py-3 pe-3 text-body-foreground">
                      <span className="block truncate">
                        {request.countryFlag} {request.country}
                      </span>
                    </td>
                    <td className="py-3 pe-3 text-muted-foreground">{formatDate(request.submittedAt, language)}</td>
                    <td className="py-3">
                      {busyId === request.id ? (
                        <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingPartnerId(request.id)}
                            aria-label={t.viewDetails}
                            title={t.viewDetails}
                            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/10 hover:text-foreground"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(request.id, request.businessName)}
                            className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/50"
                          >
                            <CheckCircleIcon className="size-3.5" />
                            {t.approve}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(request.id)}
                            className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-100 dark:bg-rose-950/50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:bg-rose-900/50"
                          >
                            <XCircleIcon className="size-3.5" />
                            {t.reject}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approved partners */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-foreground">
            {t.approvedTitle} <span className="text-muted-foreground">({approvedTotal})</span>
          </p>
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
        {approved.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.approvedEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed text-start text-sm">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[26%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t.business}</th>
                  <th className="py-2 text-left font-medium">{t.promoCode}</th>
                  <th className="py-2 text-start font-medium">{t.country}</th>
                  <th className="py-2 text-center font-medium">{t.usage}</th>
                  <th className="py-2 text-left font-medium">{t.revenue}</th>
                  <th className="py-2 text-start font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((partner) => {
                  const isActive = partner.active !== false;
                  return (
                    <tr
                      key={partner.id}
                      className={cn("border-b border-border last:border-0", !isActive && "opacity-50")}
                    >
                      <td className="py-3 pe-4 font-medium text-foreground">
                        <span className="block truncate" title={partner.businessName}>
                          {partner.businessName}
                        </span>
                        {!isActive && (
                          <span className="mt-0.5 inline-flex items-center rounded-full bg-background/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {t.paused}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pe-4">
                        <StatusBadge tone="info">
                          <TicketIcon className="size-3 shrink-0" />
                          <span className="truncate" dir="ltr" title={partner.promoCode ?? undefined}>
                            {partner.promoCode}
                          </span>
                        </StatusBadge>
                      </td>
                      <td className="py-3 pe-3 text-body-foreground">
                        <span className="block truncate">
                          {partner.countryFlag} {partner.country}
                        </span>
                      </td>
                      <td className="py-3 text-center text-body-foreground">{partner.usageCount}</td>
                      <td className="py-3 pe-3 text-left text-body-foreground">
                        <span dir="ltr">{formatUsd(partner.revenueUsd)}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingPartnerId(partner.id)}
                            aria-label={t.viewDetails}
                            title={t.viewDetails}
                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/10 hover:text-foreground"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            aria-label={isActive ? t.deactivate : t.activate}
                            title={isActive ? t.deactivate : t.activate}
                            onClick={() => handleSetActive(partner.id, !isActive)}
                            className={cn(
                              "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
                              isActive ? "bg-[#C8A24A]" : "bg-background/10"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 size-4 rounded-full bg-background shadow transition-all duration-200",
                                isActive ? "start-[18px]" : "start-0.5"
                              )}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPartnerId(partner.id)}
                            aria-label={t.deletePartner}
                            title={t.deletePartner}
                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {approved.length > 0 && (
          <div className="contents">
            <Pagination page={page} pageSize={PAGE_SIZE} totalCount={approvedTotal} onPageChange={setPage} language={language} />
          </div>
        )}
      </div>

      <PartnerDetailsModal partner={viewingPartner} language={language} onClose={() => setViewingPartnerId(null)} />
      <PartnerDeleteDialog
        open={deletingPartner !== null}
        businessName={deletingPartner?.businessName ?? ""}
        language={language}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingPartnerId(null)}
      />
    </div>
  );
}
