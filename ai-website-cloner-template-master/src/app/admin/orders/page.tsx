"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, ExternalLinkIcon, LoaderIcon, MailIcon, QrCodeIcon, SearchIcon, TrashIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { findCountry } from "@/lib/countries";
import { useLanguage } from "@/context/LanguageContext";
import { listOrders, updateOrderStatus, deleteOrder, sendOrderReminder } from "@/lib/services/orders.service";
import { formatUsd } from "@/lib/format";
import { StatusBadge, type StatusTone } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { OrderDeleteDialog } from "@/components/admin/OrderDeleteDialog";
import type { OrderDto, PaymentStatus } from "@/types/api";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
};

const COPY = {
  ar: {
    subtitle: "سجل مشتريات الدعوات الرقمية — لا توجد بوابة دفع، الأدمن يؤكد التحويلات يدوياً.",
    searchPlaceholder: "ابحث عن عميل أو بريد إلكتروني أو كود شريك...",
    all: "الكل",
    statusLabels: { paid: "مدفوع", pending: "قيد الانتظار", failed: "فشل" },
    order: "الطلب",
    customer: "العميل",
    email: "البريد الإلكتروني",
    guests: "الضيوف",
    amount: "المبلغ",
    promo: "كود الشريك",
    status: "الحالة",
    date: "التاريخ",
    preview: "معاينة",
    actions: "إجراء",
    markPaid: "تأكيد الدفع",
    markFailed: "رفض",
    deleteOrder: "حذف الطلب",
    sendReminder: "إرسال تذكير",
    reminderSent: (when: string) => `تم إرسال تذكير ${when}`,
    reminderError: "تعذّر إرسال التذكير.",
    empty: "لا توجد طلبات مطابقة.",
    totalRevenue: "إجمالي الإيرادات (المدفوعة)",
    totalOrders: "عدد الطلبات",
    loadError: "تعذّر تحميل الطلبات.",
  },
  en: {
    subtitle: "Digital invitation purchase log — no payment gateway, admin manually confirms transfers.",
    searchPlaceholder: "Search customer, email, or partner code...",
    all: "All",
    statusLabels: { paid: "Paid", pending: "Pending", failed: "Failed" },
    order: "Order",
    customer: "Customer",
    email: "Email",
    guests: "Guests",
    amount: "Amount",
    promo: "Promo code",
    status: "Status",
    date: "Date",
    preview: "Preview",
    actions: "Action",
    markPaid: "Confirm paid",
    markFailed: "Reject",
    deleteOrder: "Delete order",
    sendReminder: "Send reminder",
    reminderSent: (when: string) => `Reminder sent ${when}`,
    reminderError: "Couldn't send the reminder.",
    empty: "No matching orders.",
    totalRevenue: "Total revenue (paid)",
    totalOrders: "Total orders",
    loadError: "Couldn't load orders.",
  },
};

function formatDate(iso: string, language: "ar" | "en") {
  return new Date(iso).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminOrdersPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // Separate from the paginated table above — the summary tiles need every
  // matching order's revenue/count, not just the current page's slice.
  const [allPaidTotal, setAllPaidTotal] = useState({ revenue: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [reminderErrorId, setReminderErrorId] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // Any filter/search change invalidates the current page.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    try {
      const [pageData, totalsData] = await Promise.all([
        listOrders({ status: statusFilter, search, page, pageSize: PAGE_SIZE }),
        listOrders({ status: "paid", pageSize: 500 }),
      ]);
      // A faster, more recent load() (e.g. from a filter changed right after
      // this one fired) may have already resolved and rendered — don't let
      // this now-stale response overwrite it.
      if (loadRequestIdRef.current !== requestId) return;
      setOrders(pageData.items);
      setTotalCount(pageData.totalCount);
      setAllPaidTotal({
        revenue: totalsData.items.reduce((sum, o) => sum + o.amountUsd, 0),
        orders: totalsData.totalCount,
      });
    } catch (error) {
      console.error("[admin/orders] failed to load orders:", error);
    } finally {
      if (loadRequestIdRef.current === requestId) setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Keeps this page (and its revenue/order-count tiles) in sync with orders
  // placed or approved from a *different* session — an admin approving one
  // from their phone, or a customer checking out right now — without the
  // person sitting on this page needing to hit refresh themselves. 60s
  // (not 15s) because an admin tab left open in the background for hours
  // adds up in database data-transfer usage on a metered/free-tier plan —
  // still fresh enough for this use case, just less chatty.
  useEffect(() => {
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function handleStatusChange(id: string, status: "paid" | "failed") {
    setUpdatingId(id);
    try {
      await updateOrderStatus(id, { status });
      // Re-fetches rather than patching `orders` in place — a status flip
      // also changes allPaidTotal (revenue/order-count tiles above), which
      // was previously left stale until the next manual reload.
      await load();
    } catch (error) {
      console.error("[admin/orders] failed to update order status:", error);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSendReminder(id: string) {
    setUpdatingId(id);
    setReminderErrorId(null);
    try {
      await sendOrderReminder(id);
      // Re-fetches (not a patched row) for the same reason as
      // handleStatusChange -- keeps this in sync if the order's status
      // happened to change between render and click.
      await load();
    } catch (error) {
      console.error("[admin/orders] failed to send reminder:", error);
      setReminderErrorId(id);
      window.setTimeout(() => setReminderErrorId((current) => (current === id ? null : current)), 4000);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingOrderId) return;
    const id = deletingOrderId;
    setDeletingOrderId(null);
    try {
      await deleteOrder(id);
      await load();
    } catch (error) {
      console.error("[admin/orders] failed to delete order:", error);
    }
  }

  const deletingOrder = orders.find((o) => o.id === deletingOrderId) ?? null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-foreground" dir="ltr">
            {formatUsd(allPaidTotal.revenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t.totalRevenue}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-foreground" dir="ltr">
            {totalCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t.totalOrders}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "paid", "pending", "failed"] as const).map((key) => (
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
        {loading ? (
          <div className="flex justify-center py-8">
            <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          // A stacked card grid (not a fixed-width table) — this is the
          // review queue for the new pay-then-approve flow, and an admin
          // needs to be able to confirm/reject an order from a phone just
          // as reliably as from a desk, not only once they're back at a
          // wide screen.
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate font-medium text-foreground" dir="ltr" title={order.id}>
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-body-foreground" title={order.customerName}>
                      {order.customerName}
                    </span>
                  </div>
                  <StatusBadge tone={STATUS_TONE[order.paymentStatus]}>
                    {t.statusLabels[order.paymentStatus]}
                  </StatusBadge>
                </div>

                <span className="mt-1 block truncate text-xs text-muted-foreground" dir="ltr" title={order.customerEmail}>
                  {order.customerEmail}
                </span>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-body-foreground">
                  <span className="font-medium" dir="ltr">
                    {formatUsd(order.amountUsd)}
                  </span>
                  {order.qrEnabled && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground" dir="ltr">
                      <QrCodeIcon className="size-3.5 shrink-0" />
                      {order.qrGuestCount ?? 0}
                    </span>
                  )}
                  {order.promoCodeUsed && (
                    <span className="truncate text-muted-foreground" dir="ltr" title={order.promoCodeUsed}>
                      {order.promoCodeUsed}
                    </span>
                  )}
                  {order.country && (
                    <span className="truncate text-muted-foreground">
                      {findCountry(order.country)?.[language] ?? order.country}
                    </span>
                  )}
                  <span className="text-muted-foreground">{formatDate(order.createdAt, language)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                  {order.invitationEditUrl ? (
                    <a
                      href={order.invitationEditUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C8A24A] hover:text-[#A68832]"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                      {t.preview}
                    </a>
                  ) : (
                    <span />
                  )}

                  {updatingId === order.id ? (
                    <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {order.paymentStatus === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(order.id, "paid")}
                            title={t.markPaid}
                            className="flex size-8 items-center justify-center rounded-full text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50"
                          >
                            <CheckIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(order.id, "failed")}
                            title={t.markFailed}
                            className="flex size-8 items-center justify-center rounded-full text-rose-700 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:bg-rose-950/50"
                          >
                            <XIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendReminder(order.id)}
                            title={t.sendReminder}
                            className="flex size-8 items-center justify-center rounded-full text-[#C8A24A] transition-colors hover:bg-[#C8A24A]/10"
                          >
                            <MailIcon className="size-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeletingOrderId(order.id)}
                        title={t.deleteOrder}
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  )}
                </div>

                {reminderErrorId === order.id ? (
                  <p className="mt-1.5 text-end text-[11px] text-rose-700 dark:text-rose-400">{t.reminderError}</p>
                ) : (
                  order.reminderSentAt && (
                    <p className="mt-1.5 text-end text-[11px] text-muted-foreground">
                      {t.reminderSent(formatDate(order.reminderSentAt, language))}
                    </p>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="mt-4">
            <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} language={language} />
          </div>
        )}
      </div>

      <OrderDeleteDialog
        open={deletingOrder !== null}
        orderRef={deletingOrder ? deletingOrder.id.slice(0, 8).toUpperCase() : ""}
        language={language}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingOrderId(null)}
      />
    </div>
  );
}
