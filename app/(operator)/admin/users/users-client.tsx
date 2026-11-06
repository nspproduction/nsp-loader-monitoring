"use client";

import { useState, useTransition } from "react";
import { UserPlus, Shield, User, CheckCircle2, XCircle } from "lucide-react";
import type { OperatorRow } from "@/lib/types";
import { createUserAction, toggleUserActiveAction } from "@/actions/users";

export function UsersClient({ operators }: { operators: OperatorRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createUserAction(formData);
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        const username = String(formData.get("username") ?? "");
        setSuccess(`เพิ่ม user "${username}" สำเร็จ`);
        (document.getElementById("new-user-form") as HTMLFormElement | null)?.reset();
      }
    });
  }

  function onToggle(userId: string, nextActive: boolean) {
    startTransition(async () => {
      await toggleUserActiveAction(userId, nextActive);
    });
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <UserPlus size={18} /> เพิ่ม user ใหม่
        </h2>
        <form id="new-user-form" action={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              required
              placeholder="เช่น som"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-500 mt-1">ตัวพิมพ์เล็ก, ตัวเลข, . _ - เท่านั้น</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="display_name">
              ชื่อที่แสดง
            </label>
            <input
              id="display_name"
              name="display_name"
              required
              placeholder="เช่น สมใจ"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_admin" className="size-4 accent-blue-600" />
            ให้สิทธิ์ admin (เพิ่ม/ปิด user ได้)
          </label>
          {error && (
            <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="sm:col-span-2 text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">{success}</p>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 text-white font-medium px-5 py-2.5 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {pending ? "กำลังสร้าง…" : "สร้าง user"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">
            รายชื่อ user ({operators.length})
          </h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {operators.map((op) => (
            <li key={op.id} className="px-5 py-3 flex items-center gap-4">
              <div className="shrink-0 size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                {op.is_admin ? <Shield size={18} /> : <User size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {op.display_name}
                  {op.is_admin && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 truncate">{op.username}</div>
              </div>
              <div className="shrink-0">
                {op.is_active ? (
                  <button
                    onClick={() => onToggle(op.id, false)}
                    disabled={pending}
                    className="text-sm px-3 py-1.5 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 disabled:opacity-60"
                  >
                    <CheckCircle2 size={14} /> active
                  </button>
                ) : (
                  <button
                    onClick={() => onToggle(op.id, true)}
                    disabled={pending}
                    className="text-sm px-3 py-1.5 rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 disabled:opacity-60"
                  >
                    <XCircle size={14} /> inactive
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
