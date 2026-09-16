"use client";

import { useState } from "react";
import { LoaderIcon, SearchIcon } from "@/components/icons";
import { getInvitationOwnershipDebug } from "@/lib/services/invitations.service";
import { ApiError } from "@/lib/api/client";

// Temporary admin tool for investigating handoff-link reports (see
// InvitationsController.GetOwnershipDebug) -- the normal invitation DTO
// never exposes UserId/GuestId/TransferToken, so this is the only way to
// see who actually owns an invitation right now without direct database
// access. Read-only; safe to leave in place.
export default function OwnershipDebugPage() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof getInvitationOwnershipDebug>> | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await getInvitationOwnershipDebug(trimmed);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.status}: ${err.message}` : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        أداة تشخيص مؤقتة — تعرض من يملك دعوة معيّنة فعليًا الآن (userId/guestId/transferToken) بدون الوصول لقاعدة البيانات مباشرة.
      </p>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-xl">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="معرّف الدعوة (invitationId, GUID كامل)"
            dir="ltr"
            className="w-full rounded-full border border-border bg-card py-2 ps-9 pe-4 text-sm text-body-foreground outline-none transition-colors focus:border-[#C8A24A]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#C8A24A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A68832] disabled:opacity-60"
        >
          {loading ? <LoaderIcon className="size-4 animate-spin" /> : "تحقّق"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-400" dir="ltr">
          {error}
        </p>
      )}

      {result && (
        <pre
          dir="ltr"
          className="max-w-2xl overflow-x-auto rounded-xl border border-border bg-card p-4 text-xs text-body-foreground"
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
