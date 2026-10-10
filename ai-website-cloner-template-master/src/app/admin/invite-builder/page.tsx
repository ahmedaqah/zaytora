"use client";

import { useLanguage } from "@/context/LanguageContext";
import { ExternalLinkIcon } from "@/components/icons";

// The builder is a self-contained static tool in /public/invites/_template/.
// It edits a copy of the shared invitation design (texts, dates, images, music,
// colours), previews it live and exports a ZIP to drop under /public/invites/<slug>/.
const BUILDER_PATH = "/invites/_template/builder.html";

const COPY = {
  ar: {
    subtitle:
      "أنشئ دعوة جديدة بنفس تصميم القالب الحالي: عدّل الأسماء والتاريخ والقاعة والنصوص والصور والموسيقى والألوان، وشاهد النتيجة مباشرة، ثم نزّل الدعوة كملف ZIP.",
    steps: "بعد التنزيل: فكّ الملف داخل المجلد public/invites/ في المستودع، ثم ارفعه إلى GitHub لتظهر الدعوة على الرابط /invites/اسم-الدعوة.",
    open: "فتح في صفحة كاملة",
    frame: "منشئ الدعوات",
  },
  en: {
    subtitle:
      "Create a new invitation with the same design as the template: edit names, date, venue, texts, images, music and colours, preview it live, then download it as a ZIP.",
    steps: "After downloading: unzip it into public/invites/ in the repository and push to GitHub; the invitation will be served at /invites/<name>.",
    open: "Open full page",
    frame: "Invite builder",
  },
};

export default function AdminInviteBuilderPage() {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <span>{t.steps}</span>
        <a
          href={BUILDER_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-medium text-foreground transition-colors hover:border-[#C8A24A]"
        >
          <ExternalLinkIcon className="size-4" />
          {t.open}
        </a>
      </div>
      <iframe
        src={BUILDER_PATH}
        title={t.frame}
        className="h-[85vh] w-full rounded-2xl border border-border bg-card"
      />
    </div>
  );
}
