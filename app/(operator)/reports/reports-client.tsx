"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { QueueRow } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function ReportsClient({
  rows,
  from,
  to,
}: {
  rows: QueueRow[];
  from: string;
  to: string;
}) {
  const [fromV, setFromV] = useState(from);
  const [toV, setToV] = useState(to);

  const done = rows.filter((r) => r.status === "done");

  const kpi = useMemo(() => {
    const total = rows.length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;

    const waitTimes = done
      .filter((r) => r.started_loading_at)
      .map(
        (r) =>
          new Date(r.started_loading_at!).getTime() -
          new Date(r.arrived_at).getTime(),
      );

    const loadTimes = done
      .filter((r) => r.started_loading_at && r.finished_loading_at)
      .map(
        (r) =>
          new Date(r.finished_loading_at!).getTime() -
          new Date(r.started_loading_at!).getTime(),
      );

    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

    const p95 = (xs: number[]) => {
      if (xs.length === 0) return 0;
      const sorted = [...xs].sort((a, b) => a - b);
      const idx = Math.min(
        sorted.length - 1,
        Math.floor(sorted.length * 0.95),
      );
      return sorted[idx];
    };

    return {
      total,
      done: done.length,
      cancelled,
      avgWait: avg(waitTimes),
      p95Wait: p95(waitTimes),
      avgLoad: avg(loadTimes),
    };
  }, [rows, done]);

  const perDay = useMemo(() => {
    const map = new Map<string, { date: string; total: number; done: number }>();
    for (const r of rows) {
      const d = r.arrived_at.slice(0, 10);
      const existing = map.get(d) ?? { date: d, total: 0, done: 0 };
      existing.total += 1;
      if (r.status === "done") existing.done += 1;
      map.set(d, existing);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const perHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      count: 0,
    }));
    for (const r of rows) {
      const h = new Date(r.arrived_at).getHours();
      buckets[h].count += 1;
    }
    return buckets;
  }, [rows]);

  const waitTrend = useMemo(() => {
    const map = new Map<string, { date: string; sum: number; n: number }>();
    for (const r of done) {
      if (!r.started_loading_at) continue;
      const d = r.arrived_at.slice(0, 10);
      const wait =
        new Date(r.started_loading_at).getTime() -
        new Date(r.arrived_at).getTime();
      const existing = map.get(d) ?? { date: d, sum: 0, n: 0 };
      existing.sum += wait;
      existing.n += 1;
      map.set(d, existing);
    }
    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((x) => ({ date: x.date, avgMin: Math.round(x.sum / x.n / 60000) }));
  }, [done]);

  function exportCsv() {
    const header = [
      "arrived_at",
      "customer_name",
      "license_plate",
      "driver_name",
      "status",
      "started_loading_at",
      "finished_loading_at",
      "cancelled_at",
      "cancel_reason",
      "wait_minutes",
      "load_minutes",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const r of rows) {
      const waitMin =
        r.started_loading_at
          ? Math.round(
              (new Date(r.started_loading_at).getTime() -
                new Date(r.arrived_at).getTime()) /
                60000,
            )
          : "";
      const loadMin =
        r.started_loading_at && r.finished_loading_at
          ? Math.round(
              (new Date(r.finished_loading_at).getTime() -
                new Date(r.started_loading_at).getTime()) /
                60000,
            )
          : "";
      lines.push(
        [
          r.arrived_at,
          r.customer_name,
          r.license_plate,
          r.driver_name,
          r.status,
          r.started_loading_at ?? "",
          r.finished_loading_at ?? "",
          r.cancelled_at ?? "",
          r.cancel_reason ?? "",
          waitMin,
          loadMin,
        ]
          .map(esc)
          .join(","),
      );
    }
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loader-monitoring_${fromV}_${toV}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              จาก
            </label>
            <input
              type="date"
              value={fromV}
              onChange={(e) => setFromV(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              ถึง
            </label>
            <input
              type="date"
              value={toV}
              onChange={(e) => setToV(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <Link
            href={`/reports?from=${fromV}&to=${toV}`}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 text-center"
          >
            ปรับช่วงเวลา
          </Link>
          <button
            onClick={exportCsv}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 sm:ml-auto"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="รถทั้งหมด" value={kpi.total.toString()} />
        <Kpi label="โหลดเสร็จ" value={kpi.done.toString()} />
        <Kpi label="ยกเลิก" value={kpi.cancelled.toString()} />
        <Kpi label="รอเฉลี่ย" value={formatDuration(kpi.avgWait)} />
        <Kpi label="รอ p95" value={formatDuration(kpi.p95Wait)} />
        <Kpi label="โหลดเฉลี่ย" value={formatDuration(kpi.avgLoad)} />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-medium text-slate-900 mb-3">จำนวนรถต่อวัน</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" name="ทั้งหมด" />
              <Bar dataKey="done" fill="#10b981" name="โหลดเสร็จ" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-medium text-slate-900 mb-3">
          การกระจายตามชั่วโมง (ตลอดช่วง)
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" fontSize={10} interval={1} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {waitTrend.length > 1 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-medium text-slate-900 mb-3">
            เวลารอเฉลี่ย (นาที/วัน)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgMin"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
