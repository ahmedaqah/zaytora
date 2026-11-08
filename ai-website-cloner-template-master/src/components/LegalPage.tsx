"use client";

import { useLanguage } from "@/context/LanguageContext";

const WHATSAPP_LINK = "https://wa.me/970592706282";
const SUPPORT_EMAIL = "info@zaytorainvites.com";

export type LegalSection = { title: string; body: string[] };

export type LegalCopy = {
  eyebrow: string;
  heading: string;
  intro: string;
  sections: LegalSection[];
  contactHeading: string;
  contactWhatsapp: string;
  contactEmail: string;
};

export function LegalPage({ copy }: { copy: { ar: LegalCopy; en: LegalCopy } }) {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <div className="min-h-screen bg-background">
      <section className="px-4 pb-10 pt-20 text-center">
        <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8A24A]/30 bg-[#C8A24A]/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#C8A24A]">
          {t.eyebrow}
        </p>
        <h1 className="font-cinzel text-4xl font-bold text-foreground md:text-5xl">{t.heading}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-foreground">{t.intro}</p>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {t.sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-3 font-cinzel text-lg font-semibold text-foreground">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-relaxed text-body-foreground first:mt-0">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#C8A24A]/30 bg-[#C8A24A]/5 p-6 text-center">
          <h2 className="mb-4 font-cinzel text-lg font-semibold text-foreground">{t.contactHeading}</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#C8A24A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#A68832]"
            >
              {t.contactWhatsapp}
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background/5"
            >
              {t.contactEmail}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
