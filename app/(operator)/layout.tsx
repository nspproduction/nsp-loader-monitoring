import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/actions/auth";
import { LogOut, QrCode, BarChart3, Monitor } from "lucide-react";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: operator } = await supabase
    .from("operators")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const name = operator?.display_name ?? operator?.username ?? "operator";

  return (
    <>
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/manage" className="font-semibold text-slate-900">
              Loader Monitoring
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <Link
                href="/manage"
                className="px-3 py-1.5 rounded-md hover:bg-slate-100 flex items-center gap-1.5"
              >
                <QrCode size={16} /> จัดการคิว
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md hover:bg-slate-100 flex items-center gap-1.5"
                target="_blank"
                rel="noopener"
              >
                <Monitor size={16} /> Dashboard
              </Link>
              <Link
                href="/reports"
                className="px-3 py-1.5 rounded-md hover:bg-slate-100 flex items-center gap-1.5"
              >
                <BarChart3 size={16} /> รายงาน
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:inline">{name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-2 rounded-md hover:bg-slate-100 text-slate-600"
                title="ออกจากระบบ"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <nav className="sm:hidden border-t border-slate-200 flex text-sm">
          <Link
            href="/manage"
            className="flex-1 py-2 text-center flex items-center justify-center gap-1.5"
          >
            <QrCode size={16} /> จัดการ
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 py-2 text-center flex items-center justify-center gap-1.5"
            target="_blank"
            rel="noopener"
          >
            <Monitor size={16} /> Dashboard
          </Link>
          <Link
            href="/reports"
            className="flex-1 py-2 text-center flex items-center justify-center gap-1.5"
          >
            <BarChart3 size={16} /> รายงาน
          </Link>
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 sm:py-6">
        {children}
      </main>
    </>
  );
}
