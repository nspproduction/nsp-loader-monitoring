"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Clock, XCircle, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { QueueRow } from "@/lib/types";
import { formatHHMM, formatDuration } from "@/lib/utils";

export function DriverStatus({
  self: initialSelf,
  initialAll,
}: {
  self: QueueRow;
  initialAll: QueueRow[];
}) {
  const [all, setAll] = useState<QueueRow[]>(initialAll);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`queue-public-${initialSelf.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queues" },
        (payload) => {
          setAll((current) => {
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
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialSelf.id]);

  const self = useMemo(
    () => all.find((r) => r.id === initialSelf.id) ?? initialSelf,
    [all, initialSelf],
  );

  const waiting = useMemo(
    () =>
      all
        .filter((r) => r.status === "waiting")
        .sort((a, b) => a.priority - b.priority),
    [all],
  );

  const loadingList = useMemo(
    () => all.filter((r) => r.status === "loading"),
    [all],
  );

  const myPosition =
    self.status === "waiting"
      ? waiting.findIndex((r) => r.id === self.id) + 1
      : 0;
  const aheadCount = Math.max(0, myPosition - 1);

  return (
    <main className="flex-1 flex items-start justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <StatusHero self={self} myPosition={myPosition} aheadCount={aheadCount} />

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-medium text-slate-900 mb-3">ข้อมูลของคุณ</h3>
          <dl className="space-y-1.5 text-sm">
            <Row label="ทะเบียน" value={self.license_plate} />
            <Row label="ลูกค้า" value={self.customer_name} />
            <Row label="คนขับ" value={self.driver_name} />
            <Row label="เวลาที่มาถึง" value={formatHHMM(self.arrived_at)} />
            {self.started_loading_at && (
              <Row
                label="เริ่มโหลด"
                value={formatHHMM(self.started_loading_at)}
              />
            )}
            {self.finished_loading_at && (
              <Row
                label="โหลดเสร็จ"
                value={formatHHMM(self.finished_loading_at)}
              />
            )}
          </dl>
        </section>

        {self.status === "waiting" && loadingList.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-1.5">
              <Truck size={16} className="text-blue-600" />
              ขณะนี้กำลังโหลด {loadingList.length} คัน
            </h3>
            <ul className="space-y-2">
              {loadingList.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0"
                >
                  <span className="font-mono text-slate-900">
                    {r.license_plate}
                  </span>
                  <span className="text-slate-500 text-xs">
                    เริ่ม{" "}
                    {r.started_loading_at && formatHHMM(r.started_loading_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-center text-slate-400">
          หน้านี้อัปเดตอัตโนมัติ · บันทึกลิงก์นี้เพื่อตรวจสอบสถานะได้ตลอด
        </p>
      </div>
    </main>
  );
}

function StatusHero({
  self,
  myPosition,
  aheadCount,
}: {
  self: QueueRow;
  myPosition: number;
  aheadCount: number;
}) {
  if (self.status === "cancelled") {
    return (
      <section className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <XCircle size={48} className="mx-auto text-red-600 mb-2" />
        <h2 className="text-lg font-semibold text-red-900">คิวถูกยกเลิก</h2>
        {self.cancel_reason && (
          <p className="text-sm text-red-700 mt-1">เหตุผล: {self.cancel_reason}</p>
        )}
      </section>
    );
  }

  if (self.status === "done") {
    const loadMs =
      self.finished_loading_at && self.started_loading_at
        ? new Date(self.finished_loading_at).getTime() -
          new Date(self.started_loading_at).getTime()
        : 0;
    return (
      <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-2" />
        <h2 className="text-lg font-semibold text-emerald-900">
          โหลดสินค้าเสร็จแล้ว
        </h2>
        <p className="text-sm text-emerald-700 mt-1">
          ใช้เวลา {formatDuration(loadMs)}
        </p>
      </section>
    );
  }

  if (self.status === "loading") {
    return (
      <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
        <Loader2 size={48} className="mx-auto text-blue-600 mb-2 animate-spin" />
        <h2 className="text-lg font-semibold text-blue-900">
          กำลังโหลดสินค้าของคุณ
        </h2>
        <p className="text-sm text-blue-700 mt-1">กรุณารอการแจ้งเตือนจากเจ้าหน้าที่</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
      <Clock size={32} className="mx-auto text-slate-400 mb-2" />
      <div className="text-5xl font-bold text-slate-900">#{myPosition}</div>
      <p className="text-sm text-slate-500 mt-1">ลำดับที่ของคุณ</p>
      <p className="text-sm text-slate-700 mt-3">
        {aheadCount === 0
          ? "คุณเป็นคิวถัดไป"
          : `มีคิวข้างหน้าคุณอีก ${aheadCount} คัน`}
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 font-medium">{value}</dd>
    </div>
  );
}
