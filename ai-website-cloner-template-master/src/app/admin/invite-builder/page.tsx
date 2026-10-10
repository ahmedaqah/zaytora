"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { ExternalLinkIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import {
  getPrivateInvite,
  savePrivateInvite,
  uploadPrivateInviteMedia,
  type PrivateInviteConfig,
} from "@/lib/services/privateInvites.service";

// The builder is a self-contained static tool in /public/invites/_template/. It edits a copy of
// the shared invitation design and previews it live. Saving goes through this page (which holds
// the admin session): the builder posts the invitation plus its local media files up here, this
// page uploads the files to storage, replaces their local names with the uploaded URLs and saves
// the invitation, which then appears in "Private invites" at /invites/p/<slug>.
const BUILDER_PATH = "/invites/_template/builder.html";

const COPY = {
  ar: {
    subtitle:
      "أنشئ دعوة جديدة بنفس تصميم القالب: عدّل الأسماء والتاريخ والقاعة والنصوص والصور والموسيقى والألوان وشاهد النتيجة مباشرة، ثم احفظها لتظهر في «دعوات خاصة».",
    open: "فتح في صفحة كاملة",
    frame: "منشئ الدعوات",
    uploadFailed: "فشل رفع الملف",
  },
  en: {
    subtitle:
      "Create a new invitation with the template design: edit names, date, venue, texts, images, music and colours with a live preview, then save it to appear under Private Invites.",
    open: "Open full page",
    frame: "Invite builder",
    uploadFailed: "File upload failed",
  },
};

type SaveMessage = {
  type: "zaytora-builder-save";
  requestId: number;
  slug: string;
  title: string;
  config: PrivateInviteConfig;
  files: Record<string, Blob>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSaveMessage(value: unknown): value is SaveMessage {
  return (
    isRecord(value) &&
    value.type === "zaytora-builder-save" &&
    typeof value.requestId === "number" &&
    typeof value.slug === "string" &&
    isRecord(value.config) &&
    isRecord(value.files)
  );
}

const MEDIA_KEYS = ["cover", "coverPoster", "bg", "bgWebm", "bgPoster", "music"] as const;

export default function AdminInviteBuilderPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const reply = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const save = useCallback(
    async (msg: SaveMessage) => {
      try {
        const uploaded: Record<string, string> = {};
        for (const [path, blob] of Object.entries(msg.files)) {
          if (!(blob instanceof Blob)) continue;
          const name = path.split("/").pop() ?? "file";
          const { url } = await uploadPrivateInviteMedia(new File([blob], name, { type: blob.type }));
          uploaded[path] = url;
        }

        const config: PrivateInviteConfig = { ...msg.config };
        const media = isRecord(config.media) ? { ...config.media } : {};
        for (const key of MEDIA_KEYS) {
          const value = media[key];
          if (typeof value === "string" && uploaded[value]) media[key] = uploaded[value];
        }
        config.media = media;
        if (typeof config.ogImage === "string" && uploaded[config.ogImage]) config.ogImage = uploaded[config.ogImage];

        const saved = await savePrivateInvite(msg.slug, { title: msg.title, config });
        reply({ type: "zaytora-builder-saved", requestId: msg.requestId, ok: true, slug: saved.slug, config: saved.config });
        setTimeout(() => router.push("/admin/private-invites"), 1200);
      } catch (error) {
        const text = error instanceof ApiError ? `${error.message} (${error.status})` : t.uploadFailed;
        reply({ type: "zaytora-builder-saved", requestId: msg.requestId, ok: false, error: text });
      }
    },
    [reply, router, t.uploadFailed]
  );

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data: unknown = event.data;
      if (!isRecord(data)) return;

      if (data.type === "zaytora-builder-hello") {
        reply({ type: "zaytora-builder-host" });
        const edit = new URLSearchParams(window.location.search).get("edit");
        if (edit) {
          try {
            const invite = await getPrivateInvite(edit);
            reply({ type: "zaytora-builder-load", slug: invite.slug, config: invite.config });
          } catch {
            // Unknown slug: the builder simply starts from the template.
          }
        }
      } else if (isSaveMessage(data)) {
        void save(data);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reply, save]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <a
          href={BUILDER_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#C8A24A]"
        >
          <ExternalLinkIcon className="size-4" />
          {t.open}
        </a>
      </div>
      <iframe
        ref={frameRef}
        src={BUILDER_PATH}
        title={t.frame}
        className="h-[85vh] w-full rounded-2xl border border-border bg-card"
      />
    </div>
  );
}
