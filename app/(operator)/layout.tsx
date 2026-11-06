import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/actions/auth";
import { LogOut } from "lucide-react";
import {
  OperatorNavDesktopPrimary,
  OperatorNavDesktopSecondary,
  OperatorNavMobile
} from "./_components/operator-nav";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: operator } = await supabase
    .from("operators")
    .select("display_name, username, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const name = operator?.display_name ?? operator?.username ?? "operator";
  const isAdmin = !!operator?.is_admin;

  return (
    <>
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/manage" className="font-semibold text-slate-900">
              Loader Monitoring
            </Link>
            <OperatorNavDesktopPrimary isAdmin={isAdmin} />
          </div>
          <div className="flex items-center gap-3">
            <OperatorNavDesktopSecondary isAdmin={isAdmin} />
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
        <OperatorNavMobile isAdmin={isAdmin} />
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 sm:py-6">
        {children}
      </main>
    </>
  );
}
