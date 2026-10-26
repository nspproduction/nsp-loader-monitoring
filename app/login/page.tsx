import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const next = typeof sp?.next === "string" ? sp.next : "/manage";
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-xl font-semibold mb-1">เข้าสู่ระบบ</h1>
        <p className="text-sm text-slate-500 mb-6">ระบบติดตามคิวโหลดสินค้า</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
