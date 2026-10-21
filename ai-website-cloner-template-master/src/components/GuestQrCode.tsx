"use client";

import { useEffect, useState } from "react";
import { buildQrMatrix, shareUrlFor, type QrMatrix } from "@/lib/qrVendor";
import { cn } from "@/lib/utils";

// The real, scannable QR every guest's invitation shows for QR guest entry:
// the same code for everyone (it encodes the invitation's share link); door
// staff scan it with a scanner link and confirm the guest's name.
// Always dark-on-white with a quiet zone so it scans on any template colour.
export function GuestQrCode({
  shareCode,
  label,
  className,
}: {
  shareCode: string;
  label?: string;
  className?: string;
}) {
  const [matrix, setMatrix] = useState<QrMatrix | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildQrMatrix(shareUrlFor(shareCode))
      .then((m) => {
        if (!cancelled) setMatrix(m);
      })
      .catch((error) => console.error("[qr] failed to build the guest QR:", error));
    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  if (!matrix) return null;

  return (
    <div className={cn("mx-auto flex flex-col items-center gap-1.5", className)}>
      <div className="rounded-xl bg-white p-2 shadow-md">
        <svg
          viewBox={`-2 -2 ${matrix.size + 4} ${matrix.size + 4}`}
          className="size-28"
          role="img"
          aria-label={label ?? "QR"}
          shapeRendering="crispEdges"
        >
          <rect x={-2} y={-2} width={matrix.size + 4} height={matrix.size + 4} fill="#fff" />
          <path d={matrix.path} fill="#000" />
        </svg>
      </div>
      {label && <p className="text-[11px] tracking-wide opacity-80">{label}</p>}
    </div>
  );
}
