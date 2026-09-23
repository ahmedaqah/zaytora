"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, canUseNextImage } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { EyeIcon, LinkIcon, LoaderIcon, PenLineIcon, SparklesIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { TemplateEditModal } from "@/components/admin/TemplateEditModal";
import { TemplateDeleteDialog } from "@/components/admin/TemplateDeleteDialog";
import {
  TemplateSceneEditor,
  createEmptySceneDrafts,
  draftsToScenes,
  type SceneDraft,
} from "@/components/admin/TemplateSceneEditor";
import { CATEGORY_IDS, CATEGORY_LABELS, CATEGORY_META, type CategoryId } from "@/lib/categories";
import { analyzeImageFile, themeFromCategoryColor } from "@/lib/colorAnalysis";
import { uploadTemplateImage } from "@/lib/services/templates.service";
import { useAdminTemplates } from "@/lib/adminTemplatesStore";
import { ApiError } from "@/lib/api/client";
import type { SceneSectionKey } from "@/lib/templateScenes";
import type { TemplateWriteRequest } from "@/types/api";

const COPY = {
  ar: {
    formTitle: "إنشاء قالب جديد",
    formHint: "ارفع صورة مرجعية أو الصق رابطها، اختر التصنيف، ودع الذكاء الاصطناعي يولّد الألوان والتصميم تلقائياً.",
    templateStyleLabel: "نمط القالب",
    templateStyleClassic: "كلاسيكي (خلفية واحدة)",
    templateStyleScenes: "متعدد المشاهد (جديد)",
    scenesHint: "بالإضافة للصورة والتصنيف أدناه، حدد خلفية مستقلة لأي قسم من أقسام الدعوة تحب تميّزه عن الباقي.",
    modeFile: "رفع ملف",
    modeUrl: "رابط",
    file: "الملف المرجعي",
    filePlaceholder: "اختر صورة",
    url: "رابط الصورة المرجعية",
    urlPlaceholder: "https://example.com/reference.jpg",
    category: "التصنيف",
    categoryPlaceholder: "اختر تصنيفًا",
    generate: "أنشئ القالب بالذكاء الاصطناعي",
    generating: "جارٍ التحليل والإنشاء...",
    requiredError: "الرجاء اختيار ملف أو إدخال رابط، واختيار تصنيف.",
    genericError: "تعذر إنشاء القالب. حاول مرة أخرى.",
    listTitle: "القوالب",
    empty: "لا توجد قوالب بعد.",
    deleting: "جارٍ الحذف...",
    thumbnail: "معاينة",
    code: "الرمز",
    usage: "مرات الاستخدام",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    homepageFeatured: "مميز بالرئيسية",
    homepageFeaturedOn: "يظهر ضمن قوالب الرئيسية المثبتة",
    homepageFeaturedOff: "غير مثبت — قد يظهر تلقائياً حسب الاستخدام",
    homepageFeaturedLimit: "يمكن تمييز 4 قوالب كحد أقصى للصفحة الرئيسية. ألغِ تمييز قالب آخر أولاً.",
    homepageFeaturedFailed: "تعذر تحديث تثبيت الصفحة الرئيسية. حاول مرة أخرى.",
    activeToggleFailed: "تعذر تحديث حالة القالب. حاول مرة أخرى.",
    actions: "الإجراءات",
    preview: "معاينة",
    edit: "تعديل",
    remove: "حذف",
    removeBlocked: "هذا القالب مستخدم في دعوات حالية، يمكنك تعطيله بدل حذفه.",
    removeFailed: "تعذر حذف القالب. حاول مرة أخرى.",
  },
  en: {
    formTitle: "Create a new template",
    formHint: "Upload a reference image or paste its URL, pick a category, and let AI generate the colors and theme.",
    templateStyleLabel: "Template style",
    templateStyleClassic: "Classic (one background)",
    templateStyleScenes: "Multi-scene (new)",
    scenesHint: "On top of the image and category below, give any invitation section its own distinct background.",
    modeFile: "Upload file",
    modeUrl: "URL",
    file: "Reference file",
    filePlaceholder: "Choose an image",
    url: "Reference image URL",
    urlPlaceholder: "https://example.com/reference.jpg",
    category: "Category",
    categoryPlaceholder: "Choose a category",
    generate: "Create template with AI",
    generating: "Analyzing & generating...",
    requiredError: "Please choose a file or enter a URL, and pick a category.",
    genericError: "Couldn't create the template. Try again.",
    listTitle: "Templates",
    empty: "No templates yet.",
    deleting: "Deleting...",
    thumbnail: "Preview",
    code: "Code",
    usage: "Usage",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    homepageFeatured: "Homepage pin",
    homepageFeaturedOn: "Pinned to the homepage grid",
    homepageFeaturedOff: "Not pinned — may show automatically based on usage",
    homepageFeaturedLimit: "You can pin at most 4 templates to the homepage. Unpin another one first.",
    homepageFeaturedFailed: "Couldn't update the homepage pin. Try again.",
    activeToggleFailed: "Couldn't update the template's status. Try again.",
    actions: "Actions",
    preview: "Preview",
    edit: "Edit",
    remove: "Remove",
    removeBlocked: "This template is used by existing invitations — deactivate it instead of deleting.",
    removeFailed: "Couldn't delete the template. Try again.",
  },
};

const inputClass =
  "w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]";

export default function AdminVideoTemplatesPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const { templates, error: loadError, create, update, setActive, setHomepageFeatured, remove, refresh } = useAdminTemplates();
  const [homepageError, setHomepageError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);

  async function toggleHomepageFeatured(id: string, next: boolean) {
    setHomepageError(null);
    try {
      await setHomepageFeatured(id, next);
    } catch (err) {
      setHomepageError(err instanceof ApiError && err.status === 409 ? t.homepageFeaturedLimit : t.homepageFeaturedFailed);
    }
  }

  async function toggleActive(id: string, next: boolean) {
    setActiveError(null);
    try {
      await setActive(id, next);
    } catch (err) {
      console.error("[admin/video-templates] failed to toggle template active state:", err);
      setActiveError(t.activeToggleFailed);
    }
  }

  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "scenes" only changes what happens after the AI color analysis below —
  // the image/URL + category inputs above stay shared by both modes.
  const [templateStyle, setTemplateStyle] = useState<"classic" | "scenes">("classic");
  const [sceneDrafts, setSceneDrafts] = useState<Record<SceneSectionKey, SceneDraft>>(createEmptySceneDrafts);
  const [enabledScenes, setEnabledScenes] = useState<Set<SceneSectionKey>>(new Set());

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRecord = templates?.find((record) => record.id === editingId) ?? null;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRecord = templates?.find((record) => record.id === deletingId) ?? null;

  function openPreview(code: string) {
    window.open(`/invitationpublic?template=${encodeURIComponent(code)}`, "_blank");
  }

  function openDeleteDialog(id: string) {
    setDeletingId(id);
    setDeleteError(null);
  }

  async function confirmRemove() {
    if (!deletingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await remove(deletingId);
      setDeletingId(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Already gone server-side (e.g. a stale row from an unrefreshed list) —
        // the desired end state is already true, so just resync and close.
        await refresh();
        setDeletingId(null);
        return;
      }
      setDeleteError(err instanceof ApiError && err.status === 409 ? t.removeBlocked : t.removeFailed);
    } finally {
      setDeleting(false);
    }
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!category || (mode === "file" && !file) || (mode === "url" && !sourceUrl.trim())) {
      setError(t.requiredError);
      return;
    }

    setGenerating(true);
    try {
      const categoryColor = CATEGORY_META.find((meta) => meta.id === category)?.color ?? "#C8A24A";

      let imageUrl: string;
      let theme: ReturnType<typeof themeFromCategoryColor>;
      if (mode === "file" && file) {
        // analyzeImageFile's dataUrl is only for local color sampling — it's
        // a full base64 data: URI, far past ImageUrl's 512-char column limit
        // (Postgres rejects it with "value too long"). Upload the real file
        // to R2 instead and persist the short hosted URL it returns.
        const [analyzed, uploaded] = await Promise.all([analyzeImageFile(file), uploadTemplateImage(file)]);
        imageUrl = uploaded.url;
        theme = analyzed.theme;
      } else {
        imageUrl = sourceUrl.trim();
        theme = themeFromCategoryColor(categoryColor);
      }

      const payload: TemplateWriteRequest = {
        category,
        imageUrl,
        // A "scenes" template's sections each get their own background
        // (see scenesJson below) — the shared full-bleed photo behind the
        // whole canvas would just fight with them, so only the hero/envelope
        // (still governed by pageBg/cardBg/etc. as the fallback for any
        // section without its own scene entry) keep it.
        backgroundImageUrl: templateStyle === "scenes" ? null : imageUrl,
        layout: templateStyle === "scenes" ? "boxed-hero" : "full-bleed",
        pageBg: theme.pageBg,
        cardBg: theme.cardBg,
        textColor: theme.textColor,
        primaryAccent: theme.primaryAccent,
        sceneLayoutStyle: templateStyle === "scenes" ? "scenes" : null,
        scenesJson: templateStyle === "scenes" ? JSON.stringify(draftsToScenes(sceneDrafts, enabledScenes)) : "[]",
        isPopular: false,
        isActive: true,
      };

      await create(payload);
      setFile(null);
      setSourceUrl("");
      setTemplateStyle("classic");
      setSceneDrafts(createEmptySceneDrafts());
      setEnabledScenes(new Set());
      setCategory("");
    } catch {
      setError(t.genericError);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleGenerate}
        className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{t.formTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.formHint}</p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-body-foreground">{t.templateStyleLabel}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTemplateStyle("classic")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                templateStyle === "classic" ? "bg-[#C8A24A] text-white" : "bg-background/10 text-body-foreground hover:bg-background/15"
              )}
            >
              {t.templateStyleClassic}
            </button>
            <button
              type="button"
              onClick={() => setTemplateStyle("scenes")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                templateStyle === "scenes" ? "bg-[#C8A24A] text-white" : "bg-background/10 text-body-foreground hover:bg-background/15"
              )}
            >
              {t.templateStyleScenes}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "file" ? "bg-card text-white" : "bg-background/10 text-body-foreground hover:bg-background/15"
            )}
          >
            <UploadIcon className="size-3.5" />
            {t.modeFile}
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "url" ? "bg-card text-white" : "bg-background/10 text-body-foreground hover:bg-background/15"
            )}
          >
            <LinkIcon className="size-3.5" />
            {t.modeUrl}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "file" ? (
            <label className={cn(inputClass, "flex cursor-pointer items-center gap-2 text-muted-foreground", file && "text-foreground")}>
              <UploadIcon className="size-4 shrink-0" />
              <span className="truncate">{file ? file.name : t.filePlaceholder}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder={t.urlPlaceholder}
              className={inputClass}
            />
          )}

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryId)}
            className={inputClass}
          >
            <option value="">{t.categoryPlaceholder}</option>
            {CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {CATEGORY_LABELS[language][id]}
              </option>
            ))}
          </select>
        </div>

        {templateStyle === "scenes" && (
          <div className="rounded-xl border border-[#C8A24A]/30 bg-[#C8A24A]/5 p-4">
            <p className="mb-3 text-xs text-muted-foreground">{t.scenesHint}</p>
            <TemplateSceneEditor
              language={language}
              drafts={sceneDrafts}
              enabledSections={enabledScenes}
              onDraftsChange={setSceneDrafts}
              onEnabledSectionsChange={setEnabledScenes}
            />
          </div>
        )}

        {error && <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-[#C8A24A] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SparklesIcon className={cn("size-4", generating && "animate-pulse")} />
          {generating ? t.generating : t.generate}
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <p className="mb-4 text-sm font-semibold text-foreground">{t.listTitle}</p>
        {homepageError && (
          <p className="mb-4 text-xs font-medium text-rose-700 dark:text-rose-400">{homepageError}</p>
        )}
        {activeError && (
          <p className="mb-4 text-xs font-medium text-rose-700 dark:text-rose-400">{activeError}</p>
        )}
        {loadError ? (
          <p className="py-8 text-center text-sm text-rose-700 dark:text-rose-400">{loadError}</p>
        ) : templates === null ? (
          <div className="flex justify-center py-8">
            <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t.thumbnail}</th>
                  <th className="py-2 text-start font-medium">{t.code}</th>
                  <th className="py-2 text-start font-medium">{t.category}</th>
                  <th className="py-2 text-center font-medium">{t.usage}</th>
                  <th className="py-2 text-center font-medium">{t.status}</th>
                  <th className="py-2 text-center font-medium">{t.homepageFeatured}</th>
                  <th className="py-2 text-start font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((record) => (
                  <tr key={record.id} className="border-b border-border last:border-0">
                    <td className="py-3 pe-4">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-background/10">
                        <Image
                          src={record.imageUrl}
                          alt={record.code}
                          fill
                          unoptimized={!canUseNextImage(record.imageUrl)}
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                    </td>
                    <td className="py-3 pe-4 font-medium text-foreground">{record.code}</td>
                    <td className="py-3 pe-4 text-body-foreground">
                      {CATEGORY_LABELS[language][record.category as CategoryId] ?? record.category}
                    </td>
                    <td className="py-3 text-center text-body-foreground" dir="ltr">
                      {record.usageCount}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={record.isActive}
                        aria-label={record.isActive ? t.inactive : t.active}
                        title={record.isActive ? t.active : t.inactive}
                        onClick={() => toggleActive(record.id, !record.isActive)}
                        className={cn(
                          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
                          record.isActive ? "bg-[#C8A24A]" : "bg-background/10"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 size-4 rounded-full bg-background shadow transition-all duration-200",
                            record.isActive ? "start-[18px]" : "start-0.5"
                          )}
                        />
                      </button>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={record.isHomepageFeatured}
                        aria-label={record.isHomepageFeatured ? t.homepageFeaturedOn : t.homepageFeaturedOff}
                        title={record.isHomepageFeatured ? t.homepageFeaturedOn : t.homepageFeaturedOff}
                        onClick={() => toggleHomepageFeatured(record.id, !record.isHomepageFeatured)}
                        className={cn(
                          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
                          record.isHomepageFeatured ? "bg-[#C8A24A]" : "bg-background/10"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 size-4 rounded-full bg-background shadow transition-all duration-200",
                            record.isHomepageFeatured ? "start-[18px]" : "start-0.5"
                          )}
                        />
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openPreview(record.code)}
                          aria-label={t.preview}
                          title={t.preview}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/10 hover:text-foreground"
                        >
                          <EyeIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(record.id)}
                          aria-label={t.edit}
                          title={t.edit}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/10 hover:text-foreground"
                        >
                          <PenLineIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(record.id)}
                          aria-label={t.remove}
                          title={t.remove}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400"
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
      </div>

      <TemplateEditModal record={editingRecord} language={language} onClose={() => setEditingId(null)} onSave={update} />
      <TemplateDeleteDialog
        open={deletingRecord !== null}
        code={deletingRecord?.code ?? ""}
        language={language}
        error={deleteError}
        deleting={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
