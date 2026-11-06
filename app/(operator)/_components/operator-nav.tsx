"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, BarChart3, ScanLine, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  external?: boolean;
};

const PRIMARY: Item[] = [
  { href: "/manage", label: "จัดการคิว", mobileLabel: "จัดการ", icon: QrCode },
  { href: "/reports", label: "รายงาน", icon: BarChart3, adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true }
];

const SECONDARY: Item[] = [
  { href: "/kiosk", label: "Kiosk", icon: ScanLine, adminOnly: true, external: true }
];

function isActive(pathname: string, href: string) {
  if (href === "/manage") return pathname === "/manage";
  return pathname === href || pathname.startsWith(href + "/");
}

function desktopClass(active: boolean) {
  return `px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm ${
    active
      ? "bg-blue-50 text-blue-700 font-medium"
      : "text-slate-700 hover:bg-slate-100"
  }`;
}

function mobileClass(active: boolean, extra = "") {
  return `flex-1 py-2 text-center flex items-center justify-center gap-1.5 ${
    active
      ? "text-blue-700 font-medium border-b-2 border-blue-600"
      : "text-slate-600"
  } ${extra}`;
}

export function OperatorNavDesktopPrimary({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = PRIMARY.filter((i) => !i.adminOnly || isAdmin);
  return (
    <nav className="hidden sm:flex items-center gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={desktopClass(active)}>
            <Icon size={16} /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function OperatorNavDesktopSecondary({ isAdmin }: { isAdmin: boolean }) {
  const items = SECONDARY.filter((i) => !i.adminOnly || isAdmin);
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`hidden sm:flex ${desktopClass(false)}`}
            {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
          >
            <Icon size={16} /> {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function OperatorNavMobile({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const primary = PRIMARY.filter((i) => !i.adminOnly || isAdmin);
  const secondary = SECONDARY.filter((i) => !i.adminOnly || isAdmin);
  return (
    <nav className="sm:hidden border-t border-slate-200 flex text-sm">
      {primary.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={mobileClass(active)}
          >
            <Icon size={16} /> {item.mobileLabel ?? item.label}
          </Link>
        );
      })}
      {secondary.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={mobileClass(false, "border-l border-slate-200")}
            {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
          >
            <Icon size={16} /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
