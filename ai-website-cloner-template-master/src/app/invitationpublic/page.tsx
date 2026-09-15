import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderIcon } from "@/components/icons";
import { API_BASE_URL } from "@/lib/api/config";
import { PublicInvitationView } from "./PublicInvitationView";

const DEFAULT_TITLE = "معاينة الدعوة | ZAYTORA";

// Mirrors Step02Occasion.tsx's own AR/EN labels -- kept as an independent
// copy rather than importing that "use client" component into this server
// module, since occasion codes rarely change and generateMetadata below
// only ever needs the label text, not the picker's UI.
const OCCASION_LABELS: Record<string, { ar: string; en: string }> = {
  wedding: { ar: "زفاف", en: "Wedding" },
  engagement: { ar: "خطوبة", en: "Engagement" },
  marriage_contract: { ar: "عقد قران", en: "Marriage Contract" },
  henna: { ar: "حنة", en: "Henna" },
  bridal_shower: { ar: "حفلة العروس", en: "Bridal Shower" },
  gender_reveal: { ar: "الكشف عن الجنس", en: "Gender Reveal" },
  aqeeqah: { ar: "عقيقه", en: "Aqeeqah" },
  graduation: { ar: "تخرج", en: "Graduation" },
  birthday: { ar: "عيد ميلاد", en: "Birthday" },
};

interface InvitationMetaSource {
  language?: string | null;
  occasionType?: string | null;
  invitationType?: string | null;
  firstName?: string | null;
  secondName?: string | null;
}

// So a link shared to WhatsApp/Instagram/etc. unfurls as "حفل خطوبة اسيد
// وابرار" instead of the site's generic, identical-for-everyone title --
// the whole reason a raw share link reads as a plain URL instead of an
// actual invitation card.
function buildInvitationTitle(invitation: InvitationMetaSource): string | null {
  const firstName = invitation.firstName?.trim();
  if (!firstName) return null;
  const isEn = invitation.language === "en";
  const secondName = invitation.invitationType === "couple" ? invitation.secondName?.trim() : null;
  const names = secondName ? (isEn ? `${firstName} & ${secondName}` : `${firstName} و${secondName}`) : firstName;
  const occasion = invitation.occasionType ? OCCASION_LABELS[invitation.occasionType] : null;
  if (!occasion) {
    return isEn ? `You're Invited — ${names}` : `دعوة ${names}`;
  }
  return isEn ? `${occasion.en} — ${names}` : `حفل ${occasion.ar} ${names}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}): Promise<Metadata> {
  const { id } = await searchParams;
  if (!id) return { title: DEFAULT_TITLE };

  try {
    // Anonymous on purpose (no cookies forwarded) -- matches
    // InvitationsController.GetById's own public-visibility gate, so this
    // only ever resolves a real title for a link that's actually meant to
    // be shared (paid/approved). Any other case (still-drafting owner
    // preview, a bad id) falls back to the generic title below, same as
    // today, since the page itself still renders fine either way.
    const res = await fetch(`${API_BASE_URL}/invitations/${id}`, { cache: "no-store" });
    if (!res.ok) return { title: DEFAULT_TITLE };
    const invitation = (await res.json()) as InvitationMetaSource;
    const title = buildInvitationTitle(invitation) ?? DEFAULT_TITLE;
    const description =
      invitation.language === "en"
        ? "You're warmly invited to celebrate with us."
        : "يسعدنا دعوتكم لحضور هذه المناسبة.";
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return { title: DEFAULT_TITLE };
  }
}

export default function InvitationPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-gray-400">
          <LoaderIcon className="size-6 animate-spin" />
        </div>
      }
    >
      <PublicInvitationView />
    </Suspense>
  );
}
