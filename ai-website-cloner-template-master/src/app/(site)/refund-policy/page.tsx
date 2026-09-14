import type { Metadata } from "next";
import { RefundPolicyView } from "./RefundPolicyView";

export const metadata: Metadata = {
  title: "سياسة الاسترداد | ZAYTORA",
};

export default function RefundPolicyPage() {
  return <RefundPolicyView />;
}
