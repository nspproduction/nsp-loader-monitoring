import { createClient } from "@/lib/supabase/server";
import type { QueueRow } from "@/lib/types";
import { ReportsClient } from "./reports-client";

function parseDate(v: string | undefined, fallback: Date): Date {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
}) {
  const sp = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 6);

  const fromRaw = typeof sp?.from === "string" ? sp.from : undefined;
  const toRaw = typeof sp?.to === "string" ? sp.to : undefined;

  const from = parseDate(fromRaw, defaultFrom);
  from.setHours(0, 0, 0, 0);
  const to = parseDate(toRaw, today);
  to.setHours(23, 59, 59, 999);

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("queues")
    .select("*")
    .gte("arrived_at", from.toISOString())
    .lte("arrived_at", to.toISOString())
    .order("arrived_at", { ascending: true });

  return (
    <ReportsClient
      rows={(rows ?? []) as QueueRow[]}
      from={from.toISOString().slice(0, 10)}
      to={to.toISOString().slice(0, 10)}
    />
  );
}
