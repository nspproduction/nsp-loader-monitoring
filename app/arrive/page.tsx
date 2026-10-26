import { createAdminClient } from "@/lib/supabase/admin";
import { ArrivalForm } from "./arrival-form";

export default async function ArrivePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const sp = await searchParams;
  const token = typeof sp?.t === "string" ? sp.t : "";

  if (!token) {
    return <InvalidTokenScreen message="ลิงก์ไม่ถูกต้อง" />;
  }

  const admin = createAdminClient();
  const { data: valid } = await admin.rpc("validate_token", { p_token: token });

  if (!valid) {
    return (
      <InvalidTokenScreen message="QR นี้หมดอายุหรือถูกใช้งานแล้ว กรุณาสแกน QR ใหม่จากหน้าจอโรงงาน" />
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-xl font-semibold mb-1">แจ้งข้อมูลรถเข้ารับสินค้า</h1>
        <p className="text-sm text-slate-500 mb-5">
          กรอกข้อมูลเพื่อเข้าคิว ระบบจะบันทึกเวลาที่มาถึงให้อัตโนมัติ
        </p>
        <ArrivalForm token={token} />
      </div>
    </main>
  );
}

function InvalidTokenScreen({ message }: { message: string }) {
  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-3">
          ✕
        </div>
        <h1 className="text-lg font-semibold mb-2">QR ไม่สามารถใช้งานได้</h1>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </main>
  );
}
