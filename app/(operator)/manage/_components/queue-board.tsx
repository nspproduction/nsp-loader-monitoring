"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QueueRow, QueueStatus } from "@/lib/types";
import { DONE_WINDOW_MS } from "@/lib/utils";
import { QueueItem } from "./queue-item";

type Tab = Exclude<QueueStatus, "cancelled"> | "cancelled";

const TAB_LABEL: Record<Tab, string> = {
  waiting: "รอโหลด",
  loading: "กำลังโหลด",
  done: "เสร็จ",
  cancelled: "ยกเลิก"
};

export function QueueBoard({ initial }: { initial: QueueRow[] }) {
  const [rows, setRows] = useState<QueueRow[]>(initial);
  const [tab, setTab] = useState<Tab>("waiting");
  const [now, setNow] = useState<number>(() => Date.now());
  const minuteBucket = Math.floor(now / 60_000);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("queues-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "queues" }, (payload) => {
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const grouped = useMemo(() => {
    const cutoff = minuteBucket * 60_000 - DONE_WINDOW_MS;
    const g: Record<Tab, QueueRow[]> = {
      waiting: [],
      loading: [],
      done: [],
      cancelled: []
    };
    for (const r of rows) {
      if (r.status === "done") {
        if (!r.finished_loading_at) continue;
        if (new Date(r.finished_loading_at).getTime() < cutoff) continue;
      } else if (r.status === "cancelled") {
        if (!r.cancelled_at) continue;
        if (new Date(r.cancelled_at).getTime() < cutoff) continue;
      }
      g[r.status].push(r);
    }
    g.waiting.sort((a, b) => a.priority - b.priority);
    g.loading.sort((a, b) => (a.started_loading_at ?? "").localeCompare(b.started_loading_at ?? ""));
    g.done.sort((a, b) => (b.finished_loading_at ?? "").localeCompare(a.finished_loading_at ?? ""));
    g.cancelled.sort((a, b) => (b.cancelled_at ?? "").localeCompare(a.cancelled_at ?? ""));
    return g;
  }, [rows, minuteBucket]);

  const current = grouped[tab];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const count = grouped[t].length;
          const active = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-[25%] py-3 px-2 text-sm font-medium border-b-2 transition ${
                active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {TAB_LABEL[t]}
              {count > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs px-1.5 ${
                    active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-slate-100">
        {current.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">ไม่มีรายการ</div>
        ) : (
          current.map((row, idx) => (
            <QueueItem
              key={row.id}
              row={row}
              index={idx}
              totalInTab={current.length}
              now={now}
            />
          ))
        )}
      </div>
    </section>
  );
}
