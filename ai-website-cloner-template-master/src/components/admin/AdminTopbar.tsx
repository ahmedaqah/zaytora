"use client";

import { usePathname } from "next/navigation";
import { GlobeIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import { ADMIN_NAV } from "./adminNav";

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
      <button
        type="button"
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-body-foreground transition-colors hover:bg-background/10"
      >
        <GlobeIcon className="size-4" />
        {TOGGLE_LABEL[language]}
      </button>
    </header>
  );
}
