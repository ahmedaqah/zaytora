import type { Metadata } from "next";
import { ScanView } from "./ScanView";

// A door-staff tool opened from a private link: never indexed.
export const metadata: Metadata = {
  title: "تسجيل دخول الضيوف | ZAYTORA",
  robots: { index: false, follow: false },
};

export default function ScanPage() {
  return <ScanView />;
}
