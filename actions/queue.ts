"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireOperator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return { supabase, userId: user.id };
}

export async function startLoadingAction(queueId: string) {
  const { supabase, userId } = await requireOperator();
  const { error } = await supabase
    .from("queues")
    .update({
      status: "loading",
      started_loading_at: new Date().toISOString(),
      started_by: userId,
    })
    .eq("id", queueId)
    .eq("status", "waiting");
  if (error) return { error: error.message };
  revalidatePath("/manage");
  return { ok: true };
}

export async function finishLoadingAction(queueId: string) {
  const { supabase, userId } = await requireOperator();
  const { error } = await supabase
    .from("queues")
    .update({
      status: "done",
      finished_loading_at: new Date().toISOString(),
      finished_by: userId,
    })
    .eq("id", queueId)
    .eq("status", "loading");
  if (error) return { error: error.message };
  revalidatePath("/manage");
  return { ok: true };
}

export async function cancelQueueAction(queueId: string, reason: string) {
  const { supabase, userId } = await requireOperator();
  const { error } = await supabase
    .from("queues")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancel_reason: reason.trim() || null,
    })
    .eq("id", queueId)
    .in("status", ["waiting", "loading"]);
  if (error) return { error: error.message };
  revalidatePath("/manage");
  return { ok: true };
}

export async function reorderQueueAction(queueId: string, direction: "up" | "down") {
  const { supabase } = await requireOperator();
  const { error } = await supabase.rpc("swap_queue_priority", {
    p_queue_id: queueId,
    p_direction: direction,
  });
  if (error) return { error: error.message };
  revalidatePath("/manage");
  return { ok: true };
}
