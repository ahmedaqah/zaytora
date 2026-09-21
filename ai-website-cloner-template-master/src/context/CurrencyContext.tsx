"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_PRICE_RATES,
  loadPriceRates,
  type PriceRates,
  type PublicCurrencyCode,
} from "@/lib/priceRates";

const STORAGE_KEY = "numinds:selected-currency";
const CURRENCY_CODES: PublicCurrencyCode[] = ["USD", "SAR", "GBP", "ILS"];

type CurrencyContextValue = {
  currency: PublicCurrencyCode;
  setCurrency: (code: PublicCurrencyCode) => void;
  rates: PriceRates;
  ratesLoading: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isCurrencyCode(value: string | null): value is PublicCurrencyCode {
  return !!value && (CURRENCY_CODES as string[]).includes(value);
}

// App-wide so the currency picked on the home pricing card or the /Prices
// page survives client-side navigation into the studio/checkout flow
// without any prop drilling; persisted to localStorage so it also survives
// a full page reload or a fresh tab opened from a shared link.
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<PublicCurrencyCode>("ILS");
  const [rates, setRates] = useState<PriceRates>(DEFAULT_PRICE_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isCurrencyCode(stored)) setCurrencyState(stored);

    let cancelled = false;
    loadPriceRates().then((loaded) => {
      if (!cancelled) {
        setRates(loaded);
        setRatesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setCurrency(code: PublicCurrencyCode) {
    setCurrencyState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Storage unavailable (private browsing, etc.) — non-fatal.
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

export { CURRENCY_CODES };
