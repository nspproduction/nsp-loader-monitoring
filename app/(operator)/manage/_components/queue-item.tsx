"use client";

import { useState, useTransition } from "react";
import {
  ChevronUp,
  ChevronDown,
  Play,
  Check,
  X,
  Clock,
  User,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import type { QueueRow } from "@/lib/types";
import { formatHHMM, formatDuration } from "@/lib/utils";
import {
  startLoadingAction,
  finishLoadingAction,
  cancelQueueAction,
  reorderQueueAction
} from "@/actions/queue";

const LONG_WAIT_MS = 30 * 60 * 1000;

export function QueueItem({
  row,
  index,
  totalInTab,
  now
}: {
  row: QueueRow;
  index: number;
  totalInTab: number;
  now: number;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const waitMs = now - new Date(row.arrived_at).getTime();
  const liveLoadMs = row.started_loading_at
    ? now - new Date(row.started_loading_at).getTime()
    : 0;
  const totalLoadMs =
    row.started_loading_at && row.finished_loading_at
      ? new Date(row.finished_loading_at).getTime() -
        new Date(row.started_loading_at).getTime()
      : 0;

  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
    });
  }

  const isNext = row.status === "waiting" && index === 0;

  const containerStyles = {
    waiting: isNext
      ? "border-l-4 border-amber-400 bg-amber-50/60"
      : "border-l-4 border-slate-200 bg-white hover:bg-slate-50/60",
    loading: "border-l-4 border-blue-500 bg-blue-50/50",
    done: "border-l-4 border-emerald-400 bg-emerald-50/30",
    cancelled: "border-l-4 border-red-300 bg-red-50/20 opacity-75"
  }[row.status];

  return (
    <div className={`transition-colors ${containerStyles}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <StatusBadge row={row} index={index} isNext={isNext} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                {isNext && (
                  <div className="text-[10px] uppercase tracking-widest font-bold text-amber-600 mb-0.5">
                    คิวถัดไป
                  </div>
                )}
                <div className="font-mono font-bold text-lg text-slate-900 truncate tracking-wider leading-tight">
                  {row.license_plate}
                </div>
              </div>
              <TimeInfo
                row={row}
                waitMs={waitMs}
                liveLoadMs={liveLoadMs}
                totalLoadMs={totalLoadMs}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1 text-slate-700">
                <Package size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{row.customer_name}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-slate-700">
                <User size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{row.driver_name}</span>
              </span>
            </div>

            {row.status === "cancelled" && row.cancel_reason && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-100/80 rounded-md px-2 py-1">
                <AlertTriangle size={12} />
                {row.cancel_reason}
              </div>
            )}
          </div>

          {row.status === "waiting" && (
            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={() => act(() => reorderQueueAction(row.id, "up"))}
                disabled={pending || index === 0}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="เลื่อนขึ้น"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => act(() => reorderQueueAction(row.id, "down"))}
                disabled={pending || index === totalInTab - 1}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="เลื่อนลง"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          )}
        </div>

        {(row.status === "waiting" || row.status === "loading") &&
          !confirmCancel && (
            <div className="mt-3 flex gap-2">
              {row.status === "waiting" && (
                <button
                  onClick={() => act(() => startLoadingAction(row.id))}
                  disabled={pending}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white font-semibold rounded-lg py-2.5 shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 cursor-pointer transition"
                >
                  <Play size={16} fill="currentColor" /> เริ่มโหลด
                </button>
              )}
              {row.status === "loading" && (
                <button
                  onClick={() => act(() => finishLoadingAction(row.id))}
                  disabled={pending}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white font-semibold rounded-lg py-2.5 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 cursor-pointer transition"
                >
                  <Check size={18} strokeWidth={3} /> โหลดเสร็จ
                </button>
              )}
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={pending}
                className="px-4 inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-white text-slate-600 font-medium rounded-lg py-2.5 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60 cursor-pointer transition"
              >
                <X size={16} /> ยกเลิก
              </button>
            </div>
          )}

        {confirmCancel && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <label className="block text-sm font-medium text-red-900 mb-1.5">
              เหตุผลการยกเลิก (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
              placeholder="เช่น รถออกไปแล้ว, ข้อมูลผิด"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  act(() => cancelQueueAction(row.id, cancelReason));
                  setConfirmCancel(false);
                  setCancelReason("");
                }}
                disabled={pending}
                className="flex-1 bg-red-600 text-white font-semibold rounded-md py-2 text-sm hover:bg-red-700 disabled:opacity-60 cursor-pointer"
              >
                ยืนยันยกเลิก
              </button>
              <button
                onClick={() => {
                  setConfirmCancel(false);
                  setCancelReason("");
                }}
                className="px-4 border border-slate-200 bg-white rounded-md py-2 text-sm hover:bg-slate-50 cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  row,
  index,
  isNext
}: {
  row: QueueRow;
  index: number;
  isNext: boolean;
}) {
  if (row.status === "waiting") {
    return (
      <div
        className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg relative ${
          isNext
            ? "bg-amber-400 text-slate-900 shadow-sm shadow-amber-500/30"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {index + 1}
        {isNext && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </div>
    );
  }
  if (row.status === "loading") {
    return (
      <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 relative">
        <Truck size={22} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 ring-2 ring-white" />
        </span>
      </div>
    );
  }
  if (row.status === "done") {
    return (
      <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20">
        <CheckCircle2 size={24} />
      </div>
    );
  }
  return (
    <div className="shrink-0 w-11 h-11 rounded-xl bg-red-100 text-red-500 flex items-center justify-center">
      <XCircle size={22} />
    </div>
  );
}

function TimeInfo({
  row,
  waitMs,
  liveLoadMs,
  totalLoadMs
}: {
  row: QueueRow;
  waitMs: number;
  liveLoadMs: number;
  totalLoadMs: number;
}) {
  if (row.status === "waiting") {
    const long = waitMs > LONG_WAIT_MS;
    return (
      <div
        className={`shrink-0 text-right text-xs font-medium px-2 py-1 rounded-md ${
          long ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-700"
        }`}
      >
        <div className="font-mono tabular-nums font-semibold">
          รอ {formatDuration(waitMs)}
        </div>
        <div className="text-[10px] opacity-70 mt-0.5 flex items-center gap-0.5 justify-end">
          <Clock size={10} /> {formatHHMM(row.arrived_at)}
        </div>
      </div>
    );
  }
  if (row.status === "loading") {
    return (
      <div className="shrink-0 text-right text-xs font-medium px-2 py-1 rounded-md bg-blue-100 text-blue-800">
        <div className="font-mono tabular-nums font-semibold flex items-center gap-1 justify-end">
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          {formatDuration(liveLoadMs)}
        </div>
        <div className="text-[10px] text-blue-600/70 mt-0.5">
          เริ่ม {row.started_loading_at && formatHHMM(row.started_loading_at)}
        </div>
      </div>
    );
  }
  if (row.status === "done") {
    return (
      <div className="shrink-0 text-right text-xs font-medium px-2 py-1 rounded-md bg-emerald-100 text-emerald-800">
        <div className="font-mono tabular-nums font-semibold">
          ใช้ {formatDuration(totalLoadMs)}
        </div>
        <div className="text-[10px] text-emerald-600/70 mt-0.5">
          เสร็จ {row.finished_loading_at && formatHHMM(row.finished_loading_at)}
        </div>
      </div>
    );
  }
  return (
    <div className="shrink-0 text-right text-xs text-slate-500">
      <div className="flex items-center gap-0.5 justify-end">
        <Clock size={10} /> {formatHHMM(row.arrived_at)}
      </div>
    </div>
  );
}
