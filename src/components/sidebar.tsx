"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { AppRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hrOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/leave", label: "Leave", icon: CalendarDays },
  { href: "/payroll", label: "Payroll", icon: Wallet, hrOnly: true },
];

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const isHr = role === "admin" || role === "hr";

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {NAV.filter((item) => !item.hrOnly || isHr).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand text-white"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
