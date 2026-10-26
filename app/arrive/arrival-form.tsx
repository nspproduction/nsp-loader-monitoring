"use client";

import { useActionState } from "react";
import { submitArrivalAction, type ArrivalState } from "@/actions/arrival";

const initial: ArrivalState = {};

export function ArrivalForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(submitArrivalAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <Field
        name="customer_name"
        label="ชื่อลูกค้าของสินค้า"
        placeholder="เช่น บริษัท ABC"
        error={state.fieldErrors?.customer_name}
      />
      <Field
        name="license_plate"
        label="ทะเบียนรถ"
        placeholder="เช่น 1กข-1234"
        error={state.fieldErrors?.license_plate}
        autoCapitalize="characters"
      />
      <Field
        name="driver_name"
        label="ชื่อคนขับ"
        placeholder="เช่น สมชาย ใจดี"
        error={state.fieldErrors?.driver_name}
      />

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 text-white font-medium py-3 hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก…" : "ส่งข้อมูลและเข้าคิว"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        เวลาที่มาถึงจะถูกบันทึกเมื่อกดปุ่มส่งข้อมูล
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  error,
  autoCapitalize,
}: {
  name: string;
  label: string;
  placeholder?: string;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
