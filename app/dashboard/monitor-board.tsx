"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, PackageOpen, CheckCircle2, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { QueueRow } from "@/lib/types";
import { formatHHMM, formatDuration, DONE_WINDOW_MS } from "@/lib/utils";

export function MonitorBoard({ initial }: { initial: QueueRow[] }) {
  const [rows, setRows] = useState<QueueRow[]>(initial);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("monitor-board")
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

  // Minute-level ticker lets the memo roll "done" rows off the 12h window
  // without recomputing every second.
  const minuteBucket = Math.floor(now.getTime() / 60_000);

  const { waiting, loading, done } = useMemo(() => {
    const doneCutoff = minuteBucket * 60_000 - DONE_WINDOW_MS;
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
          new Date(r.finished_loading_at).getTime() >= doneCutoff
      )
      .sort((a, b) =>
        (b.finished_loading_at ?? "").localeCompare(a.finished_loading_at ?? "")
      );
    return { waiting, loading, done };
  }, [rows, minuteBucket]);

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <Truck className="text-blue-400" size={28} />
          <h1 className="text-2xl font-semibold tracking-tight">
            Loader Monitoring
          </h1>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
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
        </div>
      </header>

      <main className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
        <WaitingPanel rows={waiting} now={now} />
        <LoadingPanel loading={loading} done={done} now={now} />
      </main>
    </div>
  );
}

function WaitingPanel({ rows, now }: { rows: QueueRow[]; now: Date }) {
  return (
    <section className="border-r border-slate-800 flex flex-col overflow-hidden">
      <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="text-amber-400" size={22} />
          คิวรอโหลด
        </h2>
        <span className="text-3xl font-bold text-amber-400 tabular-nums">
          {rows.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-lg">
            ไม่มีคิวรอโหลด
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {rows.map((row, i) => (
              <WaitingRow key={row.id} row={row} index={i} now={now} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function WaitingRow({
  row,
  index,
  now
}: {
  row: QueueRow;
  index: number;
  now: Date;
}) {
  const waitMs = now.getTime() - new Date(row.arrived_at).getTime();
  const isNext = index === 0;
  return (
    <li
      className={`px-6 py-4 flex items-center gap-4 ${
        isNext ? "bg-amber-500/10" : ""
      }`}
    >
      <div
        className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${
          isNext
            ? "bg-amber-400 text-slate-950"
            : "bg-slate-800 text-slate-300"
        }`}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold font-mono tracking-wide truncate">
          {row.license_plate}
        </div>
        <div className="text-sm text-slate-400 truncate">
          {row.customer_name} · {row.driver_name}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm text-slate-400">มาถึง {formatHHMM(row.arrived_at)}</div>
        <div className="text-base font-medium text-amber-300">
          รอ {formatDuration(waitMs)}
        </div>
      </div>
    </li>
  );
}

function LoadingPanel({
  loading,
  done,
  now
}: {
  loading: QueueRow[];
  done: QueueRow[];
  now: Date;
}) {
  return (
    <section className="flex flex-col overflow-hidden">
      <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Truck className="text-blue-400" size={22} />
          สถานะโหลด
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-300">
            กำลังโหลด <b className="text-2xl font-bold tabular-nums">{loading.length}</b>
          </span>
          <span className="text-emerald-300">
            เสร็จ <b className="text-2xl font-bold tabular-nums">{done.length}</b>
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading.length === 0 && done.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-lg">
            ยังไม่มีรายการ
          </div>
        ) : (
          <>
            {loading.map((row) => (
              <LoadingRow key={row.id} row={row} now={now} />
            ))}
            {done.map((row) => (
              <DoneRow key={row.id} row={row} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function LoadingRow({ row, now }: { row: QueueRow; now: Date }) {
  const loadMs = row.started_loading_at
    ? now.getTime() - new Date(row.started_loading_at).getTime()
    : 0;
  return (
    <div className="rounded-2xl border-4 bg-gradient-to-br from-blue-500 to-blue-700 p-5 animate-blink-border flex items-center gap-5 text-white">
      <div className="shrink-0 w-16 h-16 rounded-xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center">
        <PackageOpen className="animate-pulse-scale" size={34} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-blue-100 font-bold loading-dots">
            กำลังโหลด
          </span>
        </div>
        <div className="text-3xl font-bold font-mono tracking-wide truncate drop-shadow">
          {row.license_plate}
        </div>
        <div className="text-sm text-blue-100 truncate">
          {row.customer_name} · {row.driver_name}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-blue-100">
          เริ่ม {row.started_loading_at && formatHHMM(row.started_loading_at)}
        </div>
        <div className="text-2xl font-bold tabular-nums drop-shadow">
          {formatDuration(loadMs)}
        </div>
      </div>
    </div>
  );
}

function DoneRow({ row }: { row: QueueRow }) {
  const loadMs =
    row.started_loading_at && row.finished_loading_at
      ? new Date(row.finished_loading_at).getTime() -
        new Date(row.started_loading_at).getTime()
      : 0;
  return (
    <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/25 p-4 flex items-center gap-4 relative overflow-hidden shadow-lg shadow-emerald-900/40">
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-400" />
      <div className="shrink-0 w-14 h-14 rounded-xl bg-emerald-500/40 ring-2 ring-emerald-300/50 flex items-center justify-center">
        <CheckCircle2 className="text-emerald-100" size={30} />
      </div>
      <div className="flex-1 min-w-0 text-emerald-50">
        <div className="text-xs uppercase tracking-[0.2em] text-emerald-200 font-bold">
          โหลดเสร็จ
        </div>
        <div className="text-2xl font-bold font-mono tracking-wide truncate">
          {row.license_plate}
        </div>
        <div className="text-sm text-emerald-100/80 truncate">
          {row.customer_name} · {row.driver_name}
        </div>
      </div>
      <div className="text-right shrink-0 text-emerald-50">
        <div className="text-xs text-emerald-200">
          เสร็จ {row.finished_loading_at && formatHHMM(row.finished_loading_at)}
        </div>
        <div className="text-lg font-bold tabular-nums">
          ใช้ {formatDuration(loadMs)}
        </div>
      </div>
    </div>
  );
}
