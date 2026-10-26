"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  token: z.string().min(10),
  customer_name: z.string().trim().min(1, "กรุณากรอกชื่อลูกค้า").max(120),
  license_plate: z.string().trim().min(1, "กรุณากรอกทะเบียนรถ").max(20),
  driver_name: z.string().trim().min(1, "กรุณากรอกชื่อคนขับ").max(120),
});

export type ArrivalState = { error?: string; fieldErrors?: Record<string, string> };

export async function submitArrivalAction(
  _prev: ArrivalState,
  formData: FormData,
): Promise<ArrivalState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    customer_name: formData.get("customer_name"),
    license_plate: formData.get("license_plate"),
    driver_name: formData.get("driver_name"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_token_and_create_queue", {
    p_token: parsed.data.token,
    p_customer_name: parsed.data.customer_name,
    p_license_plate: parsed.data.license_plate,
    p_driver_name: parsed.data.driver_name,
  });

  if (error) {
    if (error.message.includes("TOKEN_INVALID")) {
      return { error: "QR นี้หมดอายุหรือถูกใช้งานแล้ว กรุณาสแกนใหม่" };
    }
    return { error: error.message };
  }

  redirect(`/q/${data}`);
}
