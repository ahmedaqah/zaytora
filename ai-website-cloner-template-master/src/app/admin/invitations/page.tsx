"use client";

import { DashboardView } from "@/app/(site)/dashboard/DashboardView";

// Admin "active invitations": the customer dashboard's cards and tools (edit,
// responses, gallery, QR, preview, copy link) over every customer's
// invitations, with permanent delete.
export default function AdminInvitationsPage() {
  return <DashboardView adminMode />;
}
