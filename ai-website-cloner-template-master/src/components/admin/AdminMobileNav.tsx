"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import { ADMIN_NAV } from "./adminNav";

const BACK_LABEL: Record<string, string> = { ar: "العودة للموقع", en: "Back to site" };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      {[...ADMIN_NAV.slice(0, 7), null, ...ADMIN_NAV.slice(7)].map((item) => {
        // Back-to-site sits first in the second row (bottom corner, same side as the desktop sidebar link).
        if (!item) {
          return (
            <Link key="back" href="/" className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground">
              <ChevronLeftIcon className="size-5" />
              <span className="truncate px-1">{BACK_LABEL[language]}</span>
            </Link>
          );
        }
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-[#C8A24A]" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span className="truncate px-1">{item.label[language]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
