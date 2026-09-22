// Live USD-based exchange rates for the pricing card / Prices page, and now
// also the Studio checkout's base package price (PaymentPhase), with a 24h
// localStorage cache and a static fallback so displayed prices never go
// blank (offline, API rate-limited, CORS hiccup, etc.). This is the single
// source of truth for the $17.99 base price everywhere it's advertised.
// EUR exists only for the checkout's currency selector — the public
// pricing card/page intentionally only ever offers USD/SAR/GBP/ILS/AED/JOD
// via CurrencyContext's own explicit currency list.
export type PriceCurrencyCode = "USD" | "SAR" | "GBP" | "ILS" | "AED" | "JOD" | "EUR";

// The currencies the public pricing card/page and CurrencyContext offer.
// EUR exists only in PriceCurrencyCode for the Studio checkout's own
// currency selector (PaymentPhase), which isn't tied to this narrower set.
export type PublicCurrencyCode = Exclude<PriceCurrencyCode, "EUR">;

export type PriceRates = Record<PriceCurrencyCode, number>;

export const BASE_PRICE_USD = 17.99;
export const QR_GUEST_RATE_USD = 0.45;

export const DEFAULT_PRICE_RATES: PriceRates = {
  USD: 1,
  SAR: 3.75,
  GBP: 0.79,
  ILS: 3.7,
  // AED/JOD are both pegged to the US dollar, so these fixed rates stay
  // accurate on their own even before/without a live-FX fetch.
  AED: 3.6725,
  JOD: 0.709,
  EUR: 0.92,
};

const CACHE_KEY = "numinds:price-rates:v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedPayload {
  fetchedAt: number;
  rates: PriceRates;
}

function readCache(): PriceRates | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    // A payload cached before a currency (e.g. AED/JOD) existed here is
    // missing that key entirely -- trusting it as-is would silently convert
    // to NaN for it until the 24h TTL naturally expires. Treat any payload
    // that doesn't cover every currency this build knows about as stale.
    const hasEveryCurrency = (Object.keys(DEFAULT_PRICE_RATES) as PriceCurrencyCode[]).every(
      (code) => typeof parsed.rates[code] === "number" && Number.isFinite(parsed.rates[code])
    );
    if (!hasEveryCurrency) return null;
    return parsed.rates;
  } catch {
    return null;
  }
}

function writeCache(rates: PriceRates) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedPayload = { fetchedAt: Date.now(), rates };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable (private browsing, etc.) — non-fatal, the
    // rates just won't be cached for next time.
  }
}

interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

async function fetchLiveRates(): Promise<PriceRates> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) throw new Error(`Exchange rate API responded ${response.status}`);

  const data = (await response.json()) as ExchangeRateApiResponse;
  if (data.result !== "success" || !data.rates) {
    throw new Error("Exchange rate API returned an unexpected payload");
  }

  const rates: PriceRates = { ...DEFAULT_PRICE_RATES };
  for (const code of Object.keys(DEFAULT_PRICE_RATES) as PriceCurrencyCode[]) {
    const value = data.rates[code];
    if (typeof value === "number" && Number.isFinite(value)) {
      rates[code] = value;
    }
  }
  rates.USD = 1;
  return rates;
}

// Cache-first, then live fetch, then static defaults — in that order.
export async function loadPriceRates(): Promise<PriceRates> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const rates = await fetchLiveRates();
    writeCache(rates);
    return rates;
  } catch (error) {
    console.error("[pricing] failed to fetch live exchange rates, using defaults:", error);
    return DEFAULT_PRICE_RATES;
  }
}

export function convertAmount(rates: PriceRates, code: PriceCurrencyCode, amountUsd: number): number {
  return amountUsd * rates[code];
}
