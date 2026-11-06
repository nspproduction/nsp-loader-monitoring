"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/utils";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const { data: me } = await supabase
    .from("operators")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.is_admin) throw new Error("FORBIDDEN");
}

export async function createUserAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isAdmin = formData.get("is_admin") === "on";

  if (!username || !displayName || !password) {
    return { error: "กรุณากรอก username, ชื่อที่แสดง และ password" };
  }
  if (!/^[a-z0-9._-]{3,}$/.test(username)) {
    return { error: "username ต้องเป็นตัวพิมพ์เล็ก/ตัวเลข/._- และยาวอย่างน้อย 3 ตัว" };
  }
  if (password.length < 6) {
    return { error: "password ต้องยาวอย่างน้อย 6 ตัว" };
  }

  const admin = createAdminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName },
  });

  if (createErr || !created.user) {
    return { error: createErr?.message ?? "สร้าง auth user ไม่สำเร็จ" };
  }

  const { error: insertErr } = await admin.from("operators").insert({
    id: created.user.id,
    username,
    display_name: displayName,
    is_admin: isAdmin,
  });

  if (insertErr) {
    // Roll back the auth user so username stays reusable.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `บันทึก profile ไม่สำเร็จ: ${insertErr.message}` };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserActiveAction(userId: string, nextActive: boolean) {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("operators")
    .update({ is_active: nextActive })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
