import { API_BASE_URL } from "@/lib/api/config";

// The two QR libraries are vendored as classic scripts under /public/vendor
// (see public/vendor/LICENSES.txt) and loaded on demand, so neither lands in
// the main bundle: qrcode.js (generation) is only needed where a QR is shown,
// jsQR.js (decoding) only on the scanner page.

interface QrCodeApi {
  addData(data: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}

interface QrCodeFactory {
  (typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H"): QrCodeApi;
}

export interface JsQrResult {
  data: string;
}

type JsQrFn = (data: Uint8ClampedArray, width: number, height: number) => JsQrResult | null;

declare global {
  interface Window {
    qrcode?: QrCodeFactory;
    jsQR?: JsQrFn;
  }
}

const loading = new Map<string, Promise<void>>();

function loadScriptOnce(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
  loading.set(src, promise);
  return promise;
}

export async function loadJsQr(): Promise<JsQrFn> {
  await loadScriptOnce("/vendor/jsQR.js");
  if (!window.jsQR) throw new Error("jsQR unavailable");
  return window.jsQR;
}

export interface QrMatrix {
  size: number;
  /** SVG path data, one 1x1 square per dark module (viewBox 0 0 size size). */
  path: string;
}

export async function buildQrMatrix(text: string): Promise<QrMatrix> {
  await loadScriptOnce("/vendor/qrcode.js");
  if (!window.qrcode) throw new Error("qrcode unavailable");
  // typeNumber 0 = pick the smallest version that fits; "M" survives a bit of
  // glare/damage on a phone screen without making the code too dense.
  const qr = window.qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { size, path };
}

/** The guest-facing short link: ShareRedirect lives at the API root ("/i/{code}"). */
export function shareUrlFor(shareCode: string): string {
  const apiOrigin = API_BASE_URL.replace(/\/api$/, "");
  return `${apiOrigin}/i/${shareCode}`;
}

/** Pulls the share code back out of a scanned QR (the last "/i/{code}" segment). */
export function extractShareCode(scanned: string): string | null {
  const match = /\/i\/([A-Za-z0-9]+)\/?(?:[?#].*)?$/.exec(scanned.trim());
  return match ? match[1] : null;
}
