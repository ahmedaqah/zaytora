"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import { claimInvitationTransfer } from "@/lib/services/invitations.service";
import { OliveMark } from "@/components/OliveMark";
import { LoaderIcon } from "@/components/icons";

const COPY = {
  ar: {
    heading: "استلام دعوة",
    checking: "لحظة، جاري التحقق من رابط التسليم...",
    claiming: "جاري نقل الدعوة لحسابك...",
    invalidLink: "هذا الرابط غير صالح.",
    expiredOrUsed: "انتهت صلاحية هذا الرابط، أو تم استخدامه من قبل. اطلب رابطاً جديداً ممن أرسله لك.",
    genericError: "حدث خطأ، حاول مرة أخرى.",
    goToDashboard: "الذهاب للوحة التحكم",
  },
  en: {
    heading: "Receive an invitation",
    checking: "One moment, checking your handoff link...",
    claiming: "Transferring the invitation to your account...",
    invalidLink: "This link isn't valid.",
    expiredOrUsed: "This link has expired or was already used. Ask whoever sent it to you for a new one.",
    genericError: "Something went wrong. Please try again.",
    goToDashboard: "Go to dashboard",
  },
};

export function ClaimInvitationView() {
  const { language } = useLanguage();
  const t = COPY[language];
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  // Guards against Strict Mode's dev-only double-invoke of effects firing
  // claimInvitationTransfer (a single-use token) twice.
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (authLoading || claimed) return;

    if (!token) {
      setError(t.invalidLink);
      return;
    }

    if (!user) {
      const returnUrl = `/claim-invitation?token=${encodeURIComponent(token)}`;
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setClaimed(true);
    claimInvitationTransfer(token)
      .then((result) => {
        router.replace(`/studio?invitationId=${result.invitationId}`);
      })
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404 ? t.expiredOrUsed : t.genericError);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token, claimed]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="relative w-full max-w-sm">
        <div className="absolute left-1/2 top-0 z-10 flex size-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border border-border bg-card shadow-md">
          <OliveMark className="h-4 w-5" />
          <span className="font-cinzel text-[10px] font-semibold tracking-widest text-olive-vivid uppercase">ZAYTORA</span>
        </div>

        <div className="rounded-3xl border border-border bg-card px-8 pb-8 pt-14 shadow-lg">
          <h1 className="text-center text-xl font-bold text-foreground">{t.heading}</h1>

          {error ? (
            <>
              <p
                className="mt-4 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-100 dark:bg-red-950/30 px-3 py-2.5 text-center text-sm text-red-700 dark:text-red-400"
                dir="auto"
              >
                {error}
              </p>
              <Link
                href="/dashboard"
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#C8A24A] to-[#A68832] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t.goToDashboard}
              </Link>
            </>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-3 py-4 text-center text-sm text-muted-foreground">
              <LoaderIcon className="size-6 animate-spin text-gold" />
              <p>{authLoading || !user ? t.checking : t.claiming}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
