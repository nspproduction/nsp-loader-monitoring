"use client";

import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { issueTokenAction, type IssuedToken } from "@/actions/token";

export function QrPanel() {
  const [issued, setIssued] = useState<IssuedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await issueTokenAction();
    if ("error" in result) {
      setError(result.error);
      setIssued(null);
    } else {
      setIssued(result);
    }
    setLoading(false);
  }, []);

  // Initial fetch on mount — defer by one tick so the setState calls inside
  // refresh() don't fire synchronously during effect setup.
  useEffect(() => {
    const id = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  // Watch the current token row — when a driver submits the form the RPC sets
  // used_at. Regenerate immediately so the next driver sees a fresh QR.
  useEffect(() => {
    if (!issued?.tokenId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`qr-token-${issued.tokenId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "qr_tokens",
          filter: `id=eq.${issued.tokenId}`
        },
        (payload) => {
          const next = payload.new as { used_at: string | null };
          if (next.used_at) refresh();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [issued?.tokenId, refresh]);

  // Safety net: if a token expires without being used, roll it forward.
  // Always schedule via setTimeout (even for already-expired tokens) so the
  // refresh happens after this effect commits, not during it.
  useEffect(() => {
    if (!issued?.expiresAt) return;
    const msUntilExpiry = new Date(issued.expiresAt).getTime() - Date.now();
    const delay = Math.max(0, msUntilExpiry + 500);
    const id = window.setTimeout(refresh, delay);
    return () => window.clearTimeout(id);
  }, [issued?.expiresAt, refresh]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900">QR Code สำหรับคนขับสแกน</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-50 cursor-pointer"
          title="สร้าง QR ใหม่"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {issued ? (
            <QRCodeSVG
              value={issued.url}
              size={240}
              level="M"
              includeMargin
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          ) : (
            <div className="w-60 h-60 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 text-sm">
              {error ?? "กำลังโหลด…"}
            </div>
          )}
        </div>

        {issued && (
          <div className="text-sm text-slate-500">
            QR นี้ใช้ได้จนกว่าจะมีคนสแกนและส่งข้อมูล
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}
