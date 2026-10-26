import { createClient } from "@/lib/supabase/server";
import type { QueueRow } from "@/lib/types";
import { QrPanel } from "./_components/qr-panel";
import { QueueBoard } from "./_components/queue-board";

export default async function DashboardPage() {
  const supabase = await createClient();
  // 24/7 operation: always include active (waiting/loading) rows regardless of arrival date.
  // Also include anything that moved recently (24h) so the client's 12h window for done/cancelled is covered.
  // Server component is dynamic (createClient uses cookies()) — Date.now() is intentional here.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: queues } = await supabase
    .from("queues")
    .select("*")
    .or(`status.in.(waiting,loading),arrived_at.gte.${since}`)
    .order("priority", { ascending: true });

  return (
    <div className="space-y-6">
      <QrPanel />
      <QueueBoard initial={(queues ?? []) as QueueRow[]} />
    </div>
  );
}
