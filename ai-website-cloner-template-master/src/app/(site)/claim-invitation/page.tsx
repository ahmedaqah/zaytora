import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderIcon } from "@/components/icons";
import { ClaimInvitationView } from "./ClaimInvitationView";

export const metadata: Metadata = {
  title: "استلام دعوة | ZAYTORA",
};

export default function ClaimInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          <LoaderIcon className="size-6 animate-spin" />
        </div>
      }
    >
      <ClaimInvitationView />
    </Suspense>
  );
}
