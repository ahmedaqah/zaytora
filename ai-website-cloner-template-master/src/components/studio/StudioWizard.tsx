"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency, CURRENCY_CODES } from "@/context/CurrencyContext";
import type { PublicCurrencyCode } from "@/lib/priceRates";
import { ApiError } from "@/lib/api/client";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from "@/components/icons";
import { createInvitation, getInvitation, updateInvitation } from "@/lib/services/invitations.service";
import type { InvitationDetail, UpdateInvitationPatch } from "@/types/studio";
import { WizardStepper } from "./WizardStepper";
import { DraftBanner, readLastInvitationId, rememberInvitation } from "./DraftBanner";
import { PhonePreview } from "./PhonePreview";
// Code-split: a fresh /studio visit always starts on the "design" phase, so
// these three (each only rendered once `phase` moves past it — see below)
// shouldn't be part of that first load's bundle.
const PreviewPhase = dynamic(() => import("./PreviewPhase").then((m) => m.PreviewPhase));
const PaymentPhase = dynamic(() => import("./PaymentPhase").then((m) => m.PaymentPhase));
const OrderConfirmation = dynamic(() => import("./OrderConfirmation").then((m) => m.OrderConfirmation));
import { getWizardSteps, type StepErrorCode } from "./stepsConfig";
import { StepAccordionGroup } from "./StepAccordionGroup";
import { StepNavigatorDrawer } from "./StepNavigatorDrawer";
import type { OrderCreatedResponse } from "@/types/api";

type Phase = "design" | "preview" | "payment" | "confirmation";

// Groups the 18 one-field wizard steps into 5 pages, each rendered as an
// accordion of folds (see StepAccordionGroup) instead of one full page per
// field -- cuts the studio's forced "Next" clicks from 18 down to 5 without
// dropping or merging any of the underlying fields. Every step id must
// appear in exactly one group; stepsConfig's own ids are the source of
// truth this is checked against implicitly by StepNavigatorDrawer/goToStep
// still addressing steps by their real, unchanged global index.
const WIZARD_GROUPS = [
  { id: "start", stepIds: ["language", "occasion", "template"] },
  { id: "basics", stepIds: ["basic-info", "invitation-text", "location"] },
  { id: "program", stepIds: ["program", "rules", "accommodation"] },
  { id: "media", stepIds: ["gallery", "personal-message", "contacts", "music", "gift"] },
  { id: "advanced", stepIds: ["camera", "qr-entry", "rsvp", "additional"] },
] as const;

const COPY = {
  ar: {
    title: "إنشاء دعوة",
    groupTitles: {
      start: "البداية والتصميم",
      basics: "الأساسيات والنص",
      program: "البرنامج والتفاصيل",
      media: "الوسائط والضيوف",
      advanced: "الإعدادات المتقدمة",
    } satisfies Record<(typeof WIZARD_GROUPS)[number]["id"], string>,
    loadError: "تعذّر بدء الاستوديو. تأكد من تشغيل الخادم الخلفي وحاول مرة أخرى.",
    limitReached: "وصلت للحد الأقصى (5) دعوات. احذف إحدى دعواتك الحالية من لوحة التحكم لتتمكن من إنشاء دعوة جديدة.",
    forbidden: "هذه الدعوة ليست ملكك، ولا يمكنك تعديلها. تأكد من الرابط أو ارجع للوحة التحكم لفتح دعواتك الخاصة.",
    notFound: "تعذّر فتح هذه الدعوة — ربما تم حذفها، أو الرابط غير صحيح. ارجع للوحة التحكم لفتح دعواتك الخاصة.",
    connectionError: "تعذّر الاتصال بالخادم مؤقتاً — دعوتك ما زالت محفوظة بأمان. تحقق من اتصالك بالإنترنت وأعد المحاولة.",
    retry: "أعد المحاولة",
    goToDashboard: "الذهاب للوحة التحكم",
    back: "رجوع",
    next: "التالي",
    finish: "إنهاء",
    stepOf: (current: number, total: number) => `مرحلة ${current} / ${total}`,
    stepsRemaining: (count: number) => `${count} ${count === 1 ? "مرحلة" : "مراحل"} متبقية`,
    lastStep: "المرحلة الأخيرة",
    saveChanges: "حفظ التغييرات",
    previewSaveError: "تعذّر حفظ آخر تعديلاتك، فالمعاينة الكاملة كانت ستعرض نسخة قديمة. تحقق من اتصالك وحاول مرة أخرى.",
    stepErrors: {
      missingEventTitle: "الرجاء إدخال عنوان المناسبة قبل المتابعة.",
      missingFirstName: "الرجاء إدخال الاسم قبل المتابعة.",
      missingSecondName: "الرجاء إدخال اسم الطرف الثاني قبل المتابعة.",
      missingEventDate: "الرجاء تحديد تاريخ ووقت المناسبة قبل المتابعة.",
      pastEventDate: "تاريخ المناسبة لا يمكن أن يكون في الماضي.",
      missingVenueName: "الرجاء إدخال اسم كل قاعة أضفتها، أو احذف القاعات الفارغة.",
      missingWishlistItemName: "الرجاء إدخال اسم كل عنصر بقائمة الأمنيات، أو احذف العناصر الفارغة.",
      invalidQrScanRange: "وقت نهاية المسح يجب أن يكون بعد وقت البداية.",
      qrScanStartAfterEvent: "بداية المسح يجب أن تكون قبل موعد الحفل المعلن أو معه، وليس بعده.",
      programItemBeforeEvent: "هناك بند في برنامج الحفل وقته أبكر من موعد الحفل المعلن. عدّل الوقت قبل المتابعة.",
    } satisfies Record<StepErrorCode, string>,
  },
  en: {
    title: "Create Invitation",
    groupTitles: {
      start: "Getting Started & Design",
      basics: "Basics & Text",
      program: "Program & Details",
      media: "Media & Guests",
      advanced: "Advanced Settings",
    } satisfies Record<(typeof WIZARD_GROUPS)[number]["id"], string>,
    loadError: "Couldn't start the studio. Make sure the backend is running and try again.",
    limitReached: "You've reached the maximum of 5 invitations. Delete one from your dashboard to create a new one.",
    forbidden: "This invitation isn't yours, so you can't edit it. Double-check the link, or go to your dashboard to open your own invitations.",
    notFound: "Couldn't open this invitation — it may have been deleted, or the link is wrong. Go to your dashboard to open your own invitations.",
    connectionError: "Couldn't reach the server — your invitation is still saved safely. Check your connection and try again.",
    retry: "Try again",
    goToDashboard: "Go to dashboard",
    back: "Back",
    next: "Next",
    finish: "Finish",
    stepOf: (current: number, total: number) => `Stage ${current} / ${total}`,
    stepsRemaining: (count: number) => `${count} stage${count === 1 ? "" : "s"} remaining`,
    lastStep: "Last stage",
    saveChanges: "Save changes",
    previewSaveError: "Couldn't save your latest changes, so the full preview would have shown an old version. Check your connection and try again.",
    stepErrors: {
      missingEventTitle: "Please enter an event title before continuing.",
      missingFirstName: "Please enter a name before continuing.",
      missingSecondName: "Please enter the second name before continuing.",
      missingEventDate: "Please set the event date and time before continuing.",
      pastEventDate: "The event date can't be in the past.",
      missingVenueName: "Please name every venue you've added, or remove the empty ones.",
      missingWishlistItemName: "Please name every wishlist item, or remove the empty ones.",
      invalidQrScanRange: "Scan end time must be after the start time.",
      qrScanStartAfterEvent: "Scan start must be at or before the announced event time, not after.",
      programItemBeforeEvent: "One of your program items is scheduled earlier than the announced event time. Fix it before continuing.",
    } satisfies Record<StepErrorCode, string>,
  },
};

function buildPatch(detail: InvitationDetail): UpdateInvitationPatch {
  // rsvpAttendingCount/rsvpWishes are server-derived from the invitation's
  // own RSVP responses (see InvitationDetail's comment) — never sent back,
  // or a guest RSVP-ing while the owner is mid-edit would get silently
  // clobbered by the stale count/wishes this session loaded at open time.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, status, editUrl, createdAt, updatedAt, rsvpAttendingCount, rsvpWishes, ...patch } = detail;
  return {
    ...patch,
    // See UpdateInvitationPatch's own comment — every save resends the
    // whole form (not just the current step's slice, despite this
    // function's usual per-step framing), so this is recomputed fresh each
    // time from whatever's currently in eventEndDateTime rather than
    // tracked as separate "did the guest just switch modes" state.
    clearEventEndDateTime: detail.eventEndDateTime == null,
  };
}

function clampStepIndex(index: number, stepCount: number) {
  return Math.min(Math.max(index, 0), stepCount - 1);
}

function readStepIndexFromParam(stepParam: string | null, stepCount: number) {
  const parsed = stepParam ? Number.parseInt(stepParam, 10) : 1;
  if (!Number.isFinite(parsed)) return 0;
  return clampStepIndex(parsed - 1, stepCount);
}

// Mirrors readStepIndexFromParam's "resume where you left off" behavior for
// the wizard's phase -- without it, a login redirect (the returnUrl below)
// always reloaded this page fresh, which resets `phase` state back to its
// "design" default no matter which phase the guest actually continued from,
// dropping them back at the last design step instead of straight at payment.
function isValidPhase(value: string | null): value is Phase {
  return value === "preview" || value === "payment" || value === "confirmation" || value === "design";
}

const RESUME_PHASE_KEY_PREFIX = "zaytora:resumePhase:";

// Belt-and-suspenders alongside the ?phase= query param: claiming a guest
// draft right after the pre-payment login (register/login + the "claim this
// draft" call in the effect below, all racing the very first render here)
// was observed to sometimes still land back on "design" even with ?phase=
// present in the URL -- some part of that race clobbers the query string
// before this component's first paint reads it. sessionStorage isn't tied to
// the URL at all, so it survives regardless of what the navigation does to
// the query string; keyed per invitation so it can never leak onto a
// different draft opened in the same tab/session.
//
// Deliberately read-only, no removeItem here -- a useState initializer isn't
// guaranteed to only ever run once (React may invoke it, throw the render
// away for an unrelated reason, then invoke it again), so clearing the flag
// as a side effect of *reading* it here meant the first, discarded attempt
// could consume it before the render that actually commits ever saw it.
// clearResumePhase (called from a real useEffect below, which only ever
// runs after a render actually commits) is the only thing that removes it.
function readPhaseFromParam(phaseParam: string | null, invitationId: string | null): Phase {
  if (isValidPhase(phaseParam)) return phaseParam;
  if (!invitationId) return "design";
  try {
    const stored = sessionStorage.getItem(RESUME_PHASE_KEY_PREFIX + invitationId);
    if (isValidPhase(stored)) return stored;
  } catch {
    // Storage can throw (private browsing, disabled storage) -- falling
    // back to "design" here is exactly today's pre-fix behavior, not a
    // regression.
  }
  return "design";
}

function clearResumePhase(invitationId: string | null) {
  if (!invitationId) return;
  try {
    sessionStorage.removeItem(RESUME_PHASE_KEY_PREFIX + invitationId);
  } catch {
    // Nothing to clean up if storage isn't available in the first place.
  }
}

export function StudioWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, dir } = useLanguage();
  const t = COPY[language];
  // StudioWizard re-renders on every keystroke (updateForm/setForm below),
  // so an unmemoized call here would rebuild all 18 steps' closures on each
  // one — memoized so it only changes when the language actually does.
  const wizardSteps = useMemo(() => getWizardSteps(language), [language]);
  const searchParams = useSearchParams();
  const invitationIdParam = searchParams.get("invitationId");
  const currencyParam = searchParams.get("currency");
  // Set by TemplateCard's "اختر" button (homepage + /templates) — only
  // consulted on the "start a brand-new draft" path below, so it's ignored
  // once an invitationId is present (resuming an existing draft never
  // overrides its already-chosen template).
  const templateIdParam = searchParams.get("templateId");
  const { setCurrency } = useCurrency();

  // Lets a shared "/studio?currency=USD" link (e.g. the Prices page's
  // "Start Now" button) seed the checkout currency even on a cold load,
  // without waiting on the shared context's own localStorage hydration.
  useEffect(() => {
    if (currencyParam && (CURRENCY_CODES as string[]).includes(currencyParam)) {
      setCurrency(currencyParam as PublicCurrencyCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyParam]);

  const [form, setForm] = useState<InvitationDetail | null>(null);
  // Initialized from the URL's ?step= (1-indexed) so a page reload resumes
  // on the same step instead of always restarting at step 1.
  const [stepIndex, setStepIndexState] = useState(() =>
    readStepIndexFromParam(searchParams.get("step"), wizardSteps.length)
  );
  const [phase, setPhase] = useState<Phase>(() => readPhaseFromParam(searchParams.get("phase"), invitationIdParam));
  // Only fires once this specific mount has actually committed (unlike the
  // lazy initializer above, a useEffect can't run for a render React ends up
  // discarding) -- see readPhaseFromParam for why the clear has to happen
  // here instead of inline with the read.
  useEffect(() => {
    clearResumePhase(invitationIdParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationIdParam]);
  const [completedOrder, setCompletedOrder] = useState<OrderCreatedResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewSaveError, setPreviewSaveError] = useState(false);
  const [loadError, setLoadError] = useState<"generic" | "limitReached" | "forbidden" | "notFound" | "connection" | null>(null);
  // Bumped by the "connection" error state's retry button to re-run the
  // load effect below without touching invitationIdParam itself.
  const [retryToken, setRetryToken] = useState(0);
  const [stepNavOpen, setStepNavOpen] = useState(false);
  const [stepError, setStepError] = useState<StepErrorCode | null>(null);
  // Captured on first render, before this page load's own rememberInvitation()
  // call (below) can overwrite it — this is what makes it possible to detect
  // "you were previously working on a different draft".
  const [previousDraftId] = useState(readLastInvitationId);
  // Guards the createInvitation() call below against React Strict Mode's
  // dev-only double-invoke of effects. A plain boolean ref isn't enough:
  // it would stop the *second* invocation from calling createInvitation()
  // at all, while the *first* invocation's own result gets thrown away by
  // its own `cancelled` check (Strict Mode cleans it up right away) — net
  // result, neither invocation ever calls setForm() and the studio hangs on
  // its loading spinner forever. Caching the in-flight *promise* instead
  // fixes both problems: only one createInvitation() call ever fires, but
  // whichever invocation survives (isn't cancelled) still awaits and applies
  // its result.
  const creatingRef = useRef<Promise<InvitationDetail> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (invitationIdParam) {
        try {
          const detail = await getInvitation(invitationIdParam);
          if (!cancelled) {
            setForm(detail);
            rememberInvitation(detail.id);
          }
        } catch (error) {
          // A specific invitation was requested (via the URL or a "continue
          // last draft" link) and couldn't be loaded. Only a genuine 404
          // means it's actually deleted or someone else's draft (the
          // backend 404s either way rather than leaking which) — anything
          // else (a timed-out request, a network blip, the backend still
          // waking up from an idle Render instance) is a transient failure
          // that says nothing about whether the invitation still exists.
          // Treating both the same used to send a guest who just hit a slow
          // connection straight to "this may have been deleted" with no way
          // back in except starting over from scratch, even though their
          // draft was sitting there untouched the whole time.
          if (!cancelled) {
            console.error("[studio] failed to load invitation:", error);
            setLoadError(error instanceof ApiError && error.status === 404 ? "notFound" : "connection");
          }
        }
        return;
      }

      creatingRef.current ??= (async () => {
        const created = await createInvitation(templateIdParam ? { templateId: templateIdParam } : undefined);
        rememberInvitation(created.id);
        router.replace(`/studio?invitationId=${created.id}&step=${stepIndex + 1}`);
        return getInvitation(created.id);
      })();

      try {
        const detail = await creatingRef.current;
        if (!cancelled) setForm(detail);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 409) {
          // Expected, already-handled outcome (the 5-invitation cap) — the
          // page itself communicates this to the user, so it isn't logged
          // as an error (Next's dev overlay treats any console.error as a
          // crash, which it isn't here).
          setLoadError("limitReached");
          return;
        }
        console.error("[studio] failed to start a new draft:", error);
        setLoadError("generic");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationIdParam, retryToken]);

  useEffect(() => {
    if (!form || !user) return;
    // Claims this draft to the now-signed-in account if it was started
    // anonymously (backend no-ops if it's already owned by anyone) — covers
    // landing back here straight from the payment-gate login, before the
    // next field edit would otherwise trigger the same claim via autosave.
    // A 403 here means `form` is actually someone else's invitation (e.g. a
    // stale "continue your last draft" link from a different account that
    // shared this browser) — surface that instead of leaving the wizard
    // silently unable to save anything the user types.
    updateInvitation(form.id, {}).catch((error) => {
      if (error instanceof ApiError && error.status === 403) {
        setLoadError("forbidden");
        return;
      }
      console.error("[studio] failed to claim invitation:", error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, user?.id]);

  function updateForm(patch: Partial<InvitationDetail>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setStepError(null);
  }

  // Keeps ?step= (1-indexed) in sync with the current step so a reload
  // resumes where the user left off, without piling onto browser history.
  function goToStep(index: number) {
    const clamped = clampStepIndex(index, wizardSteps.length);
    setStepIndexState(clamped);
    setStepError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(clamped + 1));
    router.replace(`/studio?${params.toString()}`, { scroll: false });
  }

  // Returns whether the save actually succeeded -- callers that open a
  // *separate* page reading this invitation fresh from the backend (the
  // full preview link below) need to know before trusting that page to
  // show anything current, since a failed save here would otherwise leave
  // it silently showing whatever was last successfully persisted instead
  // of the guest's latest edits.
  async function saveProgress(): Promise<boolean> {
    if (!form) return false;
    setSaving(true);
    try {
      await updateInvitation(form.id, buildPatch(form));
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setLoadError("forbidden");
        return false;
      }
      console.error("[studio] auto-save failed:", error);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (!form) return;
    // "Next" now advances a whole group at a time (the guest browses folds
    // within a group by clicking their headers, not this button) -- so
    // every step in the current group has to pass validate() before moving
    // on, not just whichever fold happens to be expanded. goToStep(idx) on
    // a failure both shows the error and expands the offending fold (its
    // StepAccordionGroup syncs open-fold state to the real active step).
    const group = WIZARD_GROUPS.find((g) => (g.stepIds as readonly string[]).includes(wizardSteps[stepIndex].id));
    const stepsToCheck = group
      ? group.stepIds.map((id) => wizardSteps.findIndex((s) => s.id === id))
      : [stepIndex];
    for (const idx of stepsToCheck) {
      const error = wizardSteps[idx]?.validate?.(form) ?? null;
      if (error) {
        setStepError(error);
        if (idx !== stepIndex) goToStep(idx);
        return;
      }
    }
    await saveProgress();
    const lastIndexInGroup = stepsToCheck[stepsToCheck.length - 1];
    if (lastIndexInGroup >= wizardSteps.length - 1) {
      setPhase("preview");
    } else {
      goToStep(lastIndexInGroup + 1);
    }
  }

  function handleRetryLoad() {
    setLoadError(null);
    setRetryToken((current) => current + 1);
  }

  async function handleBack() {
    // No validate() call here on purpose — unlike handleNext, going back
    // should never be blocked by the step you're leaving being incomplete.
    await saveProgress();
    // Mirrors handleNext: "Back" returns to the previous group's first fold
    // rather than just the previous fold within the same group.
    const group = WIZARD_GROUPS.find((g) => (g.stepIds as readonly string[]).includes(wizardSteps[stepIndex].id));
    const groupPos = group ? WIZARD_GROUPS.findIndex((g) => g.id === group.id) : -1;
    const previousGroup = groupPos > 0 ? WIZARD_GROUPS[groupPos - 1] : null;
    if (!previousGroup) {
      goToStep(stepIndex - 1);
      return;
    }
    goToStep(wizardSteps.findIndex((s) => s.id === previousGroup.stepIds[0]));
  }

  if (loadError) {
    const message =
      loadError === "limitReached"
        ? t.limitReached
        : loadError === "forbidden"
          ? t.forbidden
          : loadError === "notFound"
            ? t.notFound
            : loadError === "connection"
              ? t.connectionError
              : t.loadError;
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg py-24 text-center">
          <p className="text-body-foreground">{message}</p>
          {loadError === "connection" ? (
            <button
              type="button"
              onClick={handleRetryLoad}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gold/90"
            >
              {t.retry}
            </button>
          ) : (
            loadError !== "generic" && (
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gold/90"
              >
                {t.goToDashboard}
              </Link>
            )
          )}
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background py-32 text-muted-foreground">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    );
  }

  const step = wizardSteps[stepIndex];
  const StepIcon = step.icon;
  const StepComponent = step.Component;
  // An admin already approved this invitation in a previous session (see
  // OrdersController.UpdateStatus) — reaching the end of the wizard again
  // is an edit, not a first-time checkout, so it shouldn't re-enter payment
  // or create a second order for the same invitation.
  const isAlreadyApproved = form.status === "paid" || form.status === "shared";
  const currentGroup = WIZARD_GROUPS.find((g) => (g.stepIds as readonly string[]).includes(step.id));
  const currentGroupSteps = currentGroup
    ? wizardSteps.filter((s) => (currentGroup.stepIds as readonly string[]).includes(s.id))
    : [];
  // Every real step belongs to exactly one group, so the progress the guest
  // actually sees (pill, dots, "N remaining") is counted in groups (1-5),
  // not the 18 underlying steps -- stepIndex/wizardSteps.length still drive
  // validation, saving, and the URL's ?step= under the hood, unchanged.
  const currentGroupIndex = currentGroup ? WIZARD_GROUPS.findIndex((g) => g.id === currentGroup.id) : stepIndex;
  const displayTotal = currentGroup ? WIZARD_GROUPS.length : wizardSteps.length;
  const displayCurrent = currentGroupIndex + 1;
  const remaining = displayTotal - displayCurrent;
  const isLastGroup = currentGroup
    ? currentGroupIndex === WIZARD_GROUPS.length - 1
    : stepIndex === wizardSteps.length - 1;

  return (
    <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-lg font-semibold text-foreground">{t.title}</h1>

      <WizardStepper activePhase={phase === "confirmation" ? "share" : phase} />
      <DraftBanner previousDraftId={previousDraftId} currentInvitationId={form.id} />

      {/* dir is read from LanguageContext (not just inherited from
          <html>) so the grid explicitly tracks the active language: the
          form, listed first in the DOM, lands in the first grid column,
          which CSS places on the visual right in rtl (Arabic — matching
          numinds.me) and on the left in ltr (English), putting the phone
          preview on the opposite side in both cases. */}
      <div dir={dir} className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {phase === "preview" && (
            <PreviewPhase
              previewSaving={previewSaving}
              previewSaveError={previewSaveError ? t.previewSaveError : null}
              onOpenFullPreview={async () => {
                // Opened synchronously (before the await below) so the
                // browser still credits this call to the click's own user
                // gesture -- popup blockers reject window.open() called
                // after an async gap, even one this short. Navigated to the
                // real URL once the save actually confirms, instead of
                // opening straight to a page that fetches this invitation
                // fresh from the backend and would otherwise show whatever
                // was last *successfully* saved, not the guest's latest
                // unsaved edits (see saveProgress's own comment).
                const newTab = window.open("", "_blank");
                setPreviewSaving(true);
                setPreviewSaveError(false);
                const saved = await saveProgress();
                setPreviewSaving(false);
                if (!saved) {
                  newTab?.close();
                  setPreviewSaveError(true);
                  return;
                }
                if (newTab) {
                  newTab.location.href = `/invitationpublic?id=${form.id}&preview=true`;
                }
              }}
              // Already admin-approved (paid/shared) — this pass through the
              // wizard is an edit of a real, existing invitation, not a new
              // one waiting on payment. It only needs saving, never another
              // order or another trip through admin review (see
              // OrdersController.UpdateStatus on the backend: paid is what
              // approval actually means).
              continueLabel={isAlreadyApproved ? t.saveChanges : undefined}
              onContinue={async () => {
                await saveProgress();
                if (isAlreadyApproved) {
                  router.push("/dashboard");
                  return;
                }
                if (!user) {
                  // Design/preview stay guest-friendly — login is only
                  // required here, right before payment, so the invitation
                  // (already saved above) can be claimed to an account. The
                  // returnUrl brings them straight back to this same draft —
                  // with phase=payment added so readPhaseFromParam resumes
                  // straight at payment instead of the login redirect's full
                  // page reload dropping `phase` state back to "design" and
                  // making them click through Finish/Continue all over again.
                  // Also stashed in sessionStorage as a fallback (see
                  // readPhaseFromParam) -- claiming a guest draft during this
                  // exact redirect was observed to sometimes still wipe
                  // ?phase= off the URL before this page's first paint reads
                  // it, and this survives that regardless of the URL.
                  if (form?.id) {
                    try {
                      sessionStorage.setItem(RESUME_PHASE_KEY_PREFIX + form.id, "payment");
                    } catch {
                      // Storage can throw (private browsing, disabled
                      // storage) -- the ?phase= param below is still there
                      // as the primary mechanism either way.
                    }
                  }
                  const returnParams = new URLSearchParams(searchParams.toString());
                  returnParams.set("phase", "payment");
                  const returnUrl = `${window.location.pathname}?${returnParams.toString()}`;
                  router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                  return;
                }
                setPhase("payment");
              }}
              onBack={() => setPhase("design")}
            />
          )}

          {phase === "payment" && (
            <PaymentPhase
              value={form}
              onBack={() => setPhase("preview")}
              onOrderCreated={(result) => {
                setCompletedOrder(result);
                setPhase("confirmation");
              }}
            />
          )}

          {phase === "confirmation" && completedOrder && (
            <OrderConfirmation order={completedOrder.order} paymentSettings={completedOrder.paymentSettings} />
          )}

          {phase === "design" && (
            <>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <StepIcon className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-body-foreground">
                    {currentGroup ? t.groupTitles[currentGroup.id] : step.label}
                  </span>
                </div>
                <button
                  type="button"
                  dir="ltr"
                  onClick={() => setStepNavOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={stepNavOpen}
                  className="rounded-full border-2 border-gold bg-gold/15 px-4 py-1.5 text-sm font-bold text-gold transition-colors hover:bg-gold/25"
                >
                  {displayCurrent} / {displayTotal}
                </button>
              </div>

              {currentGroup ? (
                <StepAccordionGroup
                  steps={currentGroupSteps}
                  activeStepId={step.id}
                  value={form}
                  onChange={updateForm}
                  onSelect={(id) => goToStep(wizardSteps.findIndex((s) => s.id === id))}
                />
              ) : (
                <>
                  <div className="border-b border-gold/15 px-5 pb-4 pt-4">
                    <p className="text-base font-medium text-foreground">{step.question}</p>
                  </div>

                  <div className="px-5 pb-2 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{step.label}</p>
                  </div>

                  <div className="px-5 pb-4 pt-2">
                    <StepComponent value={form} onChange={updateForm} />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <span>{t.stepOf(displayCurrent, displayTotal)}</span>
                <span>{remaining > 0 ? t.stepsRemaining(remaining) : t.lastStep}</span>
              </div>

              {stepError && (
                <p dir={dir} className="border-t border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 px-5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  {t.stepErrors[stepError]}
                </p>
              )}

              {/* Kept in physical left-to-right order (dir="ltr" on the row)
                  to match the reference site: Back stays on the left with
                  "<", Next/gold stays on the right with ">", regardless of
                  the page's overall RTL flow. */}
              <div dir="ltr" className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={stepIndex === 0 || saving}
                  className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-body-foreground transition-colors hover:bg-background/5 disabled:opacity-40"
                >
                  <ChevronLeftIcon className="size-4" />
                  {t.back}
                </button>
                {/* Same jump-to-any-step drawer as the "N / 5" pill in the
                    header above — this label+dots row is a second, more
                    discoverable trigger for it (the reference design's own
                    footer stepper is clickable the same way), not just a
                    passive progress readout. Hidden below `sm` since the full
                    label + dot row doesn't fit next to the Back/Next buttons
                    on a phone-width screen. */}
                <button
                  type="button"
                  onClick={() => setStepNavOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={stepNavOpen}
                  className="hidden flex-col items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-gold/5 sm:flex"
                >
                  <span className="text-base font-semibold text-body-foreground">
                    {currentGroup ? t.groupTitles[currentGroup.id] : step.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {(currentGroup ? WIZARD_GROUPS : wizardSteps).map((g, i) => (
                      <span
                        key={g.id}
                        className={cn(
                          "h-1 rounded-full transition-all",
                          i === currentGroupIndex ? "w-4 bg-gold" : "w-1 bg-background/10"
                        )}
                      />
                    ))}
                  </div>
                </button>
                {/* Mobile-only equivalent of the trigger above -- a compact
                    "N/5 ⌄" pill instead of the label+dots row, which is too
                    wide to fit between Back/Next on a phone screen. Without
                    this, phones had no visible, obviously-tappable way to
                    jump between steps (the only other trigger is the small
                    unlabeled pill in the panel header up top). */}
                <button
                  type="button"
                  onClick={() => setStepNavOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={stepNavOpen}
                  className="flex items-center gap-1.5 rounded-full border-2 border-gold bg-gold/15 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold/25 sm:hidden"
                >
                  {displayCurrent}/{displayTotal}
                  <ChevronDownIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-1 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gold/90 disabled:opacity-60"
                  )}
                >
                  {saving ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : isLastGroup ? (
                    t.finish
                  ) : (
                    <>
                      {t.next}
                      <ChevronRightIcon className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-center lg:self-start">
          <PhonePreview value={form} isTemplateStep={step.id === "template"} />
        </div>
      </div>

      {stepNavOpen && (
        <StepNavigatorDrawer
          steps={wizardSteps}
          currentIndex={stepIndex}
          language={language}
          onSelect={goToStep}
          onClose={() => setStepNavOpen(false)}
        />
      )}
    </div>
    </div>
  );
}
