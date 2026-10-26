import { createAdminClient } from "@/lib/supabase/admin";
import type { QueueRow } from "@/lib/types";
import { MonitorBoard } from "./monitor-board";

// Public page but shows live queue data — force dynamic so each request
// gets a fresh server-side read (no build-time prerender).
export const dynamic = "force-dynamic";

export default async function MonitorPage() {
  const admin = createAdminClient();
  // Widen a bit beyond the client's 12h cutoff so completed rows near the edge are included.
  // Server component runs per request (admin client is uncached) — Date.now() is intentional here.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await admin
    .from("queues")
    .select("*")
    .or(`status.in.(waiting,loading),arrived_at.gte.${since}`)
    .order("priority", { ascending: true });

  return <MonitorBoard initial={(rows ?? []) as QueueRow[]} />;
}
