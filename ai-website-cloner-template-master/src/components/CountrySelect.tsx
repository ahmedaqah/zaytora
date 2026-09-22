"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { getOrderedCountries, findCountry, countryMatchesQuery } from "@/lib/countries";

const COPY = {
  ar: { placeholder: "اختر الدولة / المنطقة", search: "ابحث عن دولة...", empty: "لا نتائج" },
  en: { placeholder: "Select country / region", search: "Search for a country...", empty: "No results" },
};

// Shared between the checkout country picker (PaymentPhase.tsx) and the
// admin's per-country payment-account manager -- both need the exact same
// pinned-then-alphabetical country list with a search box, since ~195
// countries in a plain <select> would be unusable to scan by eye.
export function CountrySelect({
  language,
  value,
  onChange,
}: {
  language: "ar" | "en";
  value: string;
  onChange: (code: string) => void;
}) {
  const t = COPY[language];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(() => getOrderedCountries(language), [language]);
  const selected = value ? findCountry(value) : undefined;

  const filtered = useMemo(() => countries.filter((c) => countryMatchesQuery(c, query)), [countries, query]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    // Panel isn't in the DOM yet on the same tick this effect fires.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-background/5 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-gold"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected[language] : t.placeholder}
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="relative border-b border-border p-2">
            <SearchIcon className="pointer-events-none absolute start-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              className="w-full rounded-lg border border-border bg-background/5 py-2 ps-8 pe-3 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-center text-xs text-muted-foreground">{t.empty}</li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === value}
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center px-3.5 py-2 text-start text-sm transition-colors hover:bg-gold/10",
                      c.code === value ? "bg-gold/10 font-medium text-gold" : "text-body-foreground"
                    )}
                  >
                    {c[language]}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
