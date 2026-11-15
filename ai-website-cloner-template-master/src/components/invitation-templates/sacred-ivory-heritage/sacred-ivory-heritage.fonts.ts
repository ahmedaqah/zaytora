import type { CSSProperties } from "react";

// This template's fonts are loaded by the visitor's browser straight from Google Fonts at runtime
// (see SacredIvoryHeritage.tsx), NOT through next/font/google. next/font/google downloads the font
// files while the site is being built, and that download repeatedly failed on Vercel's build machines
// ("next/font/google queries have exactly one entry"), which blocked every deploy of the whole site --
// for what is only a standalone preview route. Loading them at runtime keeps the build independent of
// Google.
//
// Scoped to this template only (variable names prefixed --sih-, distinct from the app-wide --font-*
// set in the root layout) so nothing here touches global font loading.
export const SIH_FONTS_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Cinzel:wght@400;600" +
  "&family=Cinzel+Decorative:wght@400;700;900" +
  "&family=Dancing+Script:wght@400;600" +
  "&family=Playfair+Display:wght@400;500" +
  "&display=swap";

export const sihFontVariables = {
  "--sih-font-cinzel": "'Cinzel', serif",
  "--sih-font-cinzel-decorative": "'Cinzel Decorative', serif",
  "--sih-font-dancing-script": "'Dancing Script', cursive",
  "--sih-font-playfair": "'Playfair Display', serif",
} as CSSProperties;
