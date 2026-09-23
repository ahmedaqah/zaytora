import type { CSSProperties } from "react";

// The content sections InvitationCanvas renders after the hero/envelope —
// those two stay governed by the template's existing PageBg/EnvelopeStyle/
// HeroFrameStyle fields untouched. A "scenes" template (Template.
// SceneLayoutStyle === "scenes") can give each of these its own background
// instead of sharing the template's one PageBg for the whole canvas.
export const SCENE_SECTION_KEYS = [
  "venue",
  "accommodation",
  "saveDate",
  "countdown",
  "program",
  "rules",
  "personalMessage",
  "gallery",
  "wishes",
  "footer",
] as const;

export type SceneSectionKey = (typeof SCENE_SECTION_KEYS)[number];

export type SceneBackgroundType = "solid" | "gradient" | "image";

export interface SceneBackground {
  type: SceneBackgroundType;
  solidColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  // Degrees, CSS linear-gradient convention (0 = bottom-to-top, 180 = top-to-bottom).
  gradientAngle?: number;
  imageUrl?: string;
}

export interface TemplateScene {
  sectionKey: SceneSectionKey;
  background: SceneBackground;
  // Overrides this section's heading/body/strong/muted text color (all four
  // to the same value) for legibility against a background the template's
  // shared TextColor wasn't chosen for -- e.g. light text on a dark accent
  // block. Undefined keeps the template's own text color for this section.
  textColor?: string;
}

function isSceneSectionKey(value: unknown): value is SceneSectionKey {
  return typeof value === "string" && (SCENE_SECTION_KEYS as readonly string[]).includes(value);
}

// Defensive by design: a malformed/legacy ScenesJson value (including the
// plain "" a pre-migration row could carry) must never throw and must never
// block rendering -- it just resolves to "no scenes configured", which the
// classic shared-background path already handles.
export function parseScenes(scenesJson: string | null | undefined): TemplateScene[] {
  if (!scenesJson) return [];
  try {
    const parsed = JSON.parse(scenesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is TemplateScene =>
        typeof entry === "object" &&
        entry !== null &&
        isSceneSectionKey((entry as { sectionKey?: unknown }).sectionKey) &&
        typeof (entry as { background?: unknown }).background === "object"
    );
  } catch {
    return [];
  }
}

export function backgroundToCss(background: SceneBackground): string | undefined {
  switch (background.type) {
    case "solid":
      return background.solidColor || undefined;
    case "gradient":
      if (!background.gradientFrom || !background.gradientTo) return undefined;
      return `linear-gradient(${background.gradientAngle ?? 180}deg, ${background.gradientFrom}, ${background.gradientTo})`;
    case "image":
      return background.imageUrl ? `url(${JSON.stringify(background.imageUrl)}) center / cover no-repeat` : undefined;
    default:
      return undefined;
  }
}

// Resolves one section's inline style (background + optional text-color
// overrides for the --tpl-text-* custom properties every section already
// reads from) — undefined when this section has no scene entry, so the
// caller just spreads {} and the section keeps the template's shared look.
export function sceneStyleFor(scenes: TemplateScene[], sectionKey: SceneSectionKey): CSSProperties | undefined {
  const scene = scenes.find((s) => s.sectionKey === sectionKey);
  if (!scene) return undefined;

  const backgroundCss = backgroundToCss(scene.background);
  const style: CSSProperties = {};
  if (backgroundCss) {
    style.background = backgroundCss;
    // A scene's own background block should read as a distinct panel, not
    // just a color change mid-scroll — matches the reference's countdown/
    // hands blocks, which are full-bleed relative to the phone frame.
    style.marginInline = "-1rem";
    style.paddingInline = "1rem";
    style.paddingBlock = "1.25rem";
  }
  if (scene.textColor) {
    const vars: Record<string, string> = {
      "--tpl-text-heading": scene.textColor,
      "--tpl-text-body": scene.textColor,
      "--tpl-text-strong": scene.textColor,
      "--tpl-text-muted": `color-mix(in srgb, ${scene.textColor} 70%, transparent)`,
    };
    Object.assign(style, vars);
  }
  return style;
}
