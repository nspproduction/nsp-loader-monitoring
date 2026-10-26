import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QueueRow } from "@/lib/types";
import { DriverStatus } from "./driver-status";

export default async function DriverStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: self } = await admin
    .from("queues")
    .select("*")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!self) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: all } = await admin
    .from("queues")
    .select("*")
    .gte("arrived_at", today.toISOString());

  return (
    <DriverStatus
      self={self as QueueRow}
      initialAll={(all ?? []) as QueueRow[]}
    />
  );
}
