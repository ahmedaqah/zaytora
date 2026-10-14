"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { ApiError } from "@/lib/api/client";
import { LoaderIcon, UploadIcon, XIcon } from "@/components/icons";
import {
  CUSTOM_INVITE_KIND,
  dataUriToBlob,
  extractHeavyAssets,
  findCoverPosterDataUri,
  findMusicDataUri,
  readInviteTitle,
  readMetaContent,
  readSlugHint,
  replaceAssetUrls,
} from "@/lib/customInvite";
import {
  deletePrivateInviteMedia,
  getPrivateInvite,
  savePrivateInvite,
  uploadPrivateInviteMedia,
  type PrivateInviteDto,
} from "@/lib/services/privateInvites.service";

// Imports a finished, self-contained invitation (one .html file with its audio/video/images inlined).
// Everything happens in the browser with the admin session: the heavy audio/video are moved out of the
// page and uploaded as separate files, then the lighter page itself is uploaded, then the invitation is
// saved as a regular private invitation (config.kind === "custom-html", see src/lib/customInvite.ts) so
// it is listed, previewed, deleted and (for its music) edited like the others.
const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;

const COPY = {
  ar: {
    open: "استيراد دعوة جاهزة",
    heading: "استيراد دعوة جاهزة (ملف HTML)",
    hint: "اختر ملف الدعوة الكامل. سيُفصل الصوت والفيديو تلقائياً ويُرفع كل ملف على حدة، ثم تظهر الدعوة في القائمة برابط خاص.",
    file: "ملف الدعوة",
    slug: "رابط الدعوة (أحرف إنجليزية صغيرة وأرقام وشرطات)",
    title: "عنوان الدعوة",
    date: "تاريخ الحفل (اختياري)",
    venue: "القاعة (اختياري)",
    description: "نص معاينة الرابط (يظهر تحت الصورة عند المشاركة)",
    submit: "رفع الدعوة",
    cancel: "إلغاء",
    uploading: "جاري الرفع",
    badSlug: "الرابط يجب أن يكون من 2 إلى 40 حرفاً: أحرف إنجليزية صغيرة وأرقام وشرطات.",
    exists: "يوجد بالفعل دعوة بهذا الرابط. اختر رابطاً آخر أو احذف القديمة أولاً.",
    noFile: "اختر ملف الدعوة أولاً.",
    badFile: "الملف ليس صفحة HTML صالحة.",
    failed: "فشل رفع الدعوة",
  },
  en: {
    open: "Import a finished invitation",
    heading: "Import a finished invitation (HTML file)",
    hint: "Choose the complete invitation file. Its audio and video are split out and uploaded as separate files, then the invitation appears in the list with its own private link.",
    file: "Invitation file",
    slug: "Invitation link (lowercase English letters, digits and hyphens)",
    title: "Invitation title",
    date: "Event date (optional)",
    venue: "Venue (optional)",
    description: "Link preview text (shown under the image when shared)",
    submit: "Upload invitation",
    cancel: "Cancel",
    uploading: "Uploading",
    badSlug: "The link must be 2-40 characters: lowercase English letters, digits and hyphens.",
    exists: "An invitation with this link already exists. Choose another link or delete the old one first.",
    noFile: "Choose the invitation file first.",
    badFile: "That file is not a valid HTML page.",
    failed: "Upload failed",
  },
};

// The preview image of the shared link: the envelope's middle third (the wax seal between the flowers).
// That slice is banner-shaped, which fits link previews (WhatsApp etc.) far better than the tall poster,
// whose top and bottom they would cut. Falls back to the whole poster if the browser cannot crop.
async function previewImageBlob(posterDataUri: string): Promise<Blob> {
  try {
    const image = new Image();
    image.src = posterDataUri;
    await image.decode();
    const width = image.naturalWidth;
    const slice = Math.floor(image.naturalHeight / 3);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(width, 1080);
    canvas.height = Math.round((slice * canvas.width) / width);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, slice, width, slice, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))), "image/jpeg", 0.88)
    );
  } catch {
    return dataUriToBlob(posterDataUri);
  }
}

const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[#C8A24A]";

interface Props {
  onImported: (invite: PrivateInviteDto) => void;
}

export function CustomInviteImport({ onImported }: Props) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The file's text is kept out of React state: it is several MB.
  const htmlRef = useRef<string | null>(null);

  const busy = progress !== null;

  function reset() {
    htmlRef.current = null;
    setFileName("");
    setSlug("");
    setTitle("");
    setDate("");
    setVenue("");
    setDescription("");
    setError(null);
  }

  function close() {
    if (busy) return;
    reset();
    setOpen(false);
  }

  async function onFileChosen(file: File | undefined) {
    setError(null);
    if (!file) return;
    const text = await file.text();
    if (!/<html[\s>]/i.test(text)) {
      htmlRef.current = null;
      setFileName("");
      setError(t.badFile);
      return;
    }
    htmlRef.current = text;
    setFileName(file.name);
    setTitle((current) => current || readInviteTitle(text));
    setSlug((current) => current || readSlugHint(text));
    setDescription((current) => current || readMetaContent(text, "og:description"));
  }

  async function submit() {
    const html = htmlRef.current;
    if (!html) {
      setError(t.noFile);
      return;
    }
    if (!SLUG.test(slug)) {
      setError(t.badSlug);
      return;
    }

    setError(null);
    setProgress("…");
    // Everything uploaded so far, so a failure part-way leaves nothing behind in storage.
    const uploaded: string[] = [];
    try {
      const exists = await getPrivateInvite(slug).then(
        () => true,
        (cause: unknown) => {
          if (cause instanceof ApiError && cause.status === 404) return false;
          throw cause;
        }
      );
      if (exists) {
        setError(t.exists);
        return;
      }

      const assets = extractHeavyAssets(html);
      const musicUri = findMusicDataUri(html);
      const posterUri = findCoverPosterDataUri(html);
      const total = assets.length + (posterUri ? 1 : 0) + 1;
      let done = 0;

      const upload = async (blob: Blob, name: string, type: string): Promise<string> => {
        const { url } = await uploadPrivateInviteMedia(new File([blob], name, { type }));
        uploaded.push(url);
        done += 1;
        setProgress(`${done}/${total}`);
        return url;
      };

      const urlByDataUri = new Map<string, string>();
      const media: Record<string, string> = {};
      let extra = 0;
      for (const asset of assets) {
        const name = asset.mime.startsWith("audio/") ? "music" : "video";
        const url = await upload(dataUriToBlob(asset.dataUri), name, asset.mime);
        urlByDataUri.set(asset.dataUri, url);
        if (asset.dataUri === musicUri) {
          media.music = url;
        } else {
          extra += 1;
          media[`asset${extra}`] = url;
        }
      }

      const ogImage = posterUri ? await upload(await previewImageBlob(posterUri), "preview.jpg", "image/jpeg") : "";
      media.page = await upload(new Blob([replaceAssetUrls(html, urlByDataUri)], { type: "text/html" }), "invite.html", "text/html");

      const config: Record<string, unknown> = {
        kind: CUSTOM_INVITE_KIND,
        media,
        ogImage,
        meta: {
          title: readMetaContent(html, "og:title") || title.trim() || slug,
          description: description.trim(),
        },
        event: date ? { start: date } : {},
        location: { venue: venue.trim() },
      };
      const saved = await savePrivateInvite(slug, { title: title.trim() || slug, config });
      onImported(saved);
      reset();
      setOpen(false);
    } catch (cause) {
      for (const url of uploaded) {
        await deletePrivateInviteMedia(url).catch(() => undefined);
      }
      setError(cause instanceof ApiError ? `${cause.message} (${cause.status})` : t.failed);
    } finally {
      setProgress(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#C8A24A]"
      >
        <UploadIcon className="size-4" />
        {t.open}
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t.heading}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>
        </div>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label={t.cancel}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t.file}</span>
          <input
            type="file"
            accept=".html,.htm,text/html"
            disabled={busy}
            onChange={(event) => void onFileChosen(event.target.files?.[0])}
            className={FIELD_CLASS}
          />
          {fileName && <span className="mt-1 block text-xs text-muted-foreground">{fileName}</span>}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t.slug}</span>
          <input
            type="text"
            dir="ltr"
            value={slug}
            disabled={busy}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t.title}</span>
          <input type="text" value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} className={FIELD_CLASS} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t.description}</span>
          <textarea
            rows={2}
            value={description}
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t.date}</span>
            <input type="date" dir="ltr" value={date} disabled={busy} onChange={(event) => setDate(event.target.value)} className={FIELD_CLASS} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t.venue}</span>
            <input type="text" value={venue} disabled={busy} onChange={(event) => setVenue(event.target.value)} className={FIELD_CLASS} />
          </label>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[#C8A24A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <LoaderIcon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
          {busy ? `${t.uploading} ${progress}` : t.submit}
        </button>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#C8A24A] disabled:opacity-50"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
