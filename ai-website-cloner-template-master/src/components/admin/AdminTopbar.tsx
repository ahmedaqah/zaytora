"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon, GlobeIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import { ADMIN_NAV } from "./adminNav";

const BACK_LABEL: Record<string, string> = { ar: "العودة للموقع", en: "Back to site" };
const TOGGLE_LABEL: Record<string, string> = { ar: "EN", en: "عربي" };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTopbar() {
  const pathname = usePathname();
  const { language, toggleLanguage } = useLanguage();
  const active = ADMIN_NAV.find((item) => isActive(pathname, item.href)) ?? ADMIN_NAV[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6">
      <h1 className="text-lg font-semibold text-foreground">{active.label[language]}</h1>
      <div className="flex items-center gap-2">
      {/* The sidebar (which holds this link on desktop) is hidden below lg. */}
      <Link
        href="/"
        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-body-foreground transition-colors hover:bg-background/10 lg:hidden"
      >
        <ChevronLeftIcon className="size-4 shrink-0" />
        {BACK_LABEL[language]}
      </Link>
      <button
        type="button"
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-body-foreground transition-colors hover:bg-background/10"
      >
        <GlobeIcon className="size-4" />
        {TOGGLE_LABEL[language]}
      </button>
      </div>
    </header>
  );
}
