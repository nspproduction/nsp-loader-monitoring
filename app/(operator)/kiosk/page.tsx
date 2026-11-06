import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QueueRow } from "@/lib/types";
import { MonitorBoardQR } from "@/app/dashboard/monitor-board-qr";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("operators")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) redirect("/manage");

  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabase
    .from("queues")
    .select("*")
    .or(`status.in.(waiting,loading),arrived_at.gte.${since}`)
    .order("priority", { ascending: true });

  return <MonitorBoardQR initial={(rows ?? []) as QueueRow[]} />;
}
