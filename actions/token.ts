"use server";

import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const TTL_SECONDS = Number(process.env.QR_TOKEN_TTL_SECONDS ?? 900);

export interface IssuedToken {
  tokenId: string;
  token: string;
  expiresAt: string;
  url: string;
}

export async function issueTokenAction(): Promise<IssuedToken | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const nowIso = new Date().toISOString();
  const base = process.env.APP_URL ?? "";

  // Reuse the operator's existing valid, unused token if one is still active —
  // otherwise refreshing the dashboard would mint a brand-new row every time.
  const { data: existing } = await supabase
    .from("qr_tokens")
    .select("id, token, expires_at")
    .eq("issued_by", user.id)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      tokenId: existing.id,
      token: existing.token,
      expiresAt: existing.expires_at,
      url: `${base}/arrive?t=${existing.token}`,
    };
  }

  const token = randomBytes(16).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

  const { data: inserted, error } = await supabase
    .from("qr_tokens")
    .insert({ token, issued_by: user.id, expires_at: expiresAt })
    .select("id")
    .single();

  if (error || !inserted) return { error: error?.message ?? "insert failed" };

  return {
    tokenId: inserted.id,
    token,
    expiresAt,
    url: `${base}/arrive?t=${token}`,
  };
}
