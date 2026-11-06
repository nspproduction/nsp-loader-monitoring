"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Clock, RefreshCw, Truck, ScanLine, Maximize, Minimize } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { issueTokenAction, type IssuedToken } from "@/actions/token";
import type { QueueRow } from "@/lib/types";
import { DONE_WINDOW_MS } from "@/lib/utils";
import { WaitingPanel, LoadingPanel } from "./monitor-board";

export function MonitorBoardQR({ initial }: { initial: QueueRow[] }) {
  const [rows, setRows] = useState<QueueRow[]>(initial);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("monitor-board-qr")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queues" },
        (payload) => {
          setRows((current) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as QueueRow;
              return [...current.filter((r) => r.id !== next.id), next];
            }
            if (payload.eventType === "UPDATE") {
              const next = payload.new as QueueRow;
              return current.map((r) => (r.id === next.id ? next : r));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as QueueRow;
              return current.filter((r) => r.id !== old.id);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const minuteBucket = Math.floor(now.getTime() / 60_000);

  const { waiting, loading, done, cancelled } = useMemo(() => {
    const cutoff = minuteBucket * 60_000 - DONE_WINDOW_MS;
    const waiting = rows
      .filter((r) => r.status === "waiting")
      .sort((a, b) => a.priority - b.priority);
    const loading = rows
      .filter((r) => r.status === "loading")
      .sort((a, b) =>
        (a.started_loading_at ?? "").localeCompare(b.started_loading_at ?? "")
      );
    const done = rows
      .filter(
        (r) =>
          r.status === "done" &&
          r.finished_loading_at &&
          new Date(r.finished_loading_at).getTime() >= cutoff
      )
      .sort((a, b) =>
        (b.finished_loading_at ?? "").localeCompare(a.finished_loading_at ?? "")
      );
    const cancelled = rows
      .filter(
        (r) =>
          r.status === "cancelled" &&
          r.cancelled_at &&
          new Date(r.cancelled_at).getTime() >= cutoff
      )
      .sort((a, b) =>
        (b.cancelled_at ?? "").localeCompare(a.cancelled_at ?? "")
      );
    return { waiting, loading, done, cancelled };
  }, [rows, minuteBucket]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <Truck className="text-blue-400 size-7" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Loader Monitoring
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-4xl font-mono font-bold tabular-nums">
              {now.toLocaleTimeString("th-TH", { hour12: false })}
            </div>
            <div className="text-sm text-slate-400">
              {now.toLocaleDateString("th-TH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </div>
          </div>
          <FullscreenButton />
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[1fr_1fr_380px] overflow-hidden">
        <WaitingPanel rows={waiting} now={now} />
        <LoadingPanel loading={loading} done={done} cancelled={cancelled} now={now} />
        <QrSidePanel />
      </main>
    </div>
  );
}

function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <button
      onClick={toggle}
      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 ring-1 ring-slate-700 cursor-pointer"
      title={isFullscreen ? "ออกจากเต็มหน้าจอ" : "เต็มหน้าจอ"}
    >
      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
    </button>
  );
}

function QrSidePanel() {
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

  useEffect(() => {
    const id = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  useEffect(() => {
    if (!issued?.tokenId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`kiosk-qr-token-${issued.tokenId}`)
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

  useEffect(() => {
    if (!issued?.expiresAt) return;
    const msUntilExpiry = new Date(issued.expiresAt).getTime() - Date.now();
    const delay = Math.max(0, msUntilExpiry + 500);
    const id = window.setTimeout(refresh, delay);
    return () => window.clearTimeout(id);
  }, [issued?.expiresAt, refresh]);

  return (
    <section className="flex flex-col min-h-0 bg-slate-900/40 border-l border-slate-800">
      <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ScanLine className="text-fuchsia-400" size={22} />
          สแกนเพื่อเข้าคิว
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-md hover:bg-slate-800 text-slate-300 disabled:opacity-50 cursor-pointer"
          title="สร้าง QR ใหม่"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6">
        {issued ? (
          <>
            <div className="rounded-2xl bg-white p-5 shadow-2xl shadow-fuchsia-500/10 ring-1 ring-slate-800">
              <QRCodeSVG
                value={issued.url}
                size={280}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-fuchsia-300 text-sm uppercase tracking-[0.25em] font-semibold">
                <Clock size={14} />
                พร้อมสแกน
              </div>
              <div className="text-slate-400 text-sm max-w-[260px]">
                QR นี้ใช้ได้จนกว่าจะมีคนสแกนและส่งข้อมูล
              </div>
            </div>
          </>
        ) : (
          <div className="w-[280px] h-[280px] bg-slate-800/60 rounded-2xl flex items-center justify-center text-slate-500 text-sm">
            {error ?? "กำลังโหลด…"}
          </div>
        )}
        {error && issued && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    </section>
  );
}
