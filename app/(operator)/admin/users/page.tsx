import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OperatorRow } from "@/lib/types";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("operators")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.is_admin) redirect("/manage");

  const admin = createAdminClient();
  const { data: operators } = await admin
    .from("operators")
    .select("*")
    .order("created_at", { ascending: true });

  return <UsersClient operators={(operators ?? []) as OperatorRow[]} />;
}
