"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InstagramIcon, MailIcon, TikTokIcon } from "@/components/icons";
import { OliveMark } from "@/components/OliveMark";
import { useLanguage } from "@/context/LanguageContext";
import { getContactSettings } from "@/lib/services/contactSettings.service";
import { useEmailCopyToast } from "@/hooks/useEmailCopyToast";
import type { ContactSettingsDto } from "@/types/api";

// Matches Header.tsx's ROUTES mapping for the same nav items.
const PAGE_LINK_HREFS = ["/#templates", "/studio", "/guide", "/contact-us"];

// Same order as legalLinks below (Terms, Privacy, Refund, Delete Account) --
// only Refund Policy has a real page so far, the rest stay dead "#" links.
const LEGAL_LINK_HREFS: Array<string | undefined> = [undefined, undefined, "/refund-policy", undefined];

const COPY = {
  ar: {
    tagline: "دعوات رقمية فاخرة لأجمل لحظاتك.",
    pagesHeading: "الصفحات",
    pageLinks: ["القوالب", "الاستوديو", "الدليل", "تواصل معنا"],
    featuresHeading: "المميزات",
    featureLinks: ["دعم ثنائي اللغة", "إدارة الردود", "كاميرا الحدث", "مشاركة رمز QR"],
    contactHeading: "تواصل معنا",
    copyright: "© 2026 ZAYTORA. جميع الحقوق محفوظة.",
    legalLinks: ["الشروط والأحكام", "سياسة الخصوصية", "سياسة الاسترداد", "Delete Account"],
    copied: (address: string) => `تم نسخ ${address} — الصقه في تطبيق البريد الذي تفضّله.`,
  },
  en: {
    tagline: "Luxury digital invitations for your most beautiful moments.",
    pagesHeading: "Pages",
    pageLinks: ["Templates", "Studio", "Guide", "Contact Us"],
    featuresHeading: "Features",
    featureLinks: ["Bilingual support", "RSVP management", "Event camera", "QR code sharing"],
    contactHeading: "Contact Us",
    copyright: "© 2026 ZAYTORA. All rights reserved.",
    legalLinks: ["Terms & Conditions", "Privacy Policy", "Refund Policy", "Delete Account"],
    copied: (address: string) => `Copied ${address} — paste it into your preferred mail app.`,
  },
};

export function Footer() {
  const { language } = useLanguage();
  const t = COPY[language];
  const [settings, setSettings] = useState<ContactSettingsDto | null>(null);
  const { copiedAddress, handleEmailClick } = useEmailCopyToast();

  useEffect(() => {
    let cancelled = false;
    getContactSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer id="contact" className="py-16 border-t bg-background border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <span className="flex items-center gap-1.5 font-cinzel text-xl text-olive-vivid">
              <OliveMark className="h-6 w-7 shrink-0" />
              ZAYTORA
            </span>
            <p className="mt-4 text-sm text-muted-foreground">{t.tagline}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground">{t.pagesHeading}</h3>
            <ul className="space-y-3">
              {t.pageLinks.map((label, index) => (
                <li key={label}>
                  <Link
                    href={PAGE_LINK_HREFS[index]}
                    className="text-sm hover:text-[#C8A24A] transition-colors text-muted-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground">{t.featuresHeading}</h3>
            <ul className="space-y-3">
              {t.featureLinks.map((label) => (
                <li key={label}>
                  <a href="#" className="text-sm hover:text-[#C8A24A] transition-colors text-muted-foreground">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground">{t.contactHeading}</h3>
            <div className="flex items-center gap-3">
              <a
                href={settings?.email ? `mailto:${settings.email}` : "#"}
                onClick={settings?.email ? () => handleEmailClick(settings.email) : undefined}
                aria-label="Email"
                className="flex size-10 items-center justify-center rounded-full transition-colors bg-muted text-muted-foreground hover:bg-accent"
              >
                <MailIcon className="size-4" />
              </a>
              <a
                href={settings?.instagramUrl || "#"}
                target={settings?.instagramUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex size-10 items-center justify-center rounded-full bg-pink-50 text-pink-500 transition-colors hover:bg-pink-100"
              >
                <InstagramIcon className="size-4" />
              </a>
              <a
                href={settings?.tikTokUrl || "#"}
                target={settings?.tikTokUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex size-10 items-center justify-center rounded-full transition-colors bg-accent text-foreground hover:opacity-80"
              >
                <TikTokIcon className="size-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-border">
          <p className="text-sm text-muted-foreground">{t.copyright}</p>
          <ul className="flex flex-wrap items-center justify-center gap-6">
            {t.legalLinks.map((label, index) => {
              const href = LEGAL_LINK_HREFS[index];
              const linkClassName = "text-sm hover:text-[#C8A24A] transition-colors text-muted-foreground";
              return (
                <li key={label}>
                  {href ? (
                    <Link href={href} className={linkClassName}>
                      {label}
                    </Link>
                  ) : (
                    <a href="#" className={linkClassName}>
                      {label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {copiedAddress && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <p className="rounded-full bg-gray-900 px-5 py-2.5 text-xs font-medium text-white shadow-lg" dir="auto">
            {t.copied(copiedAddress)}
          </p>
        </div>
      )}
    </footer>
  );
}
