"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

const tabs = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/produits", label: "Produits", icon: Boxes },
  { href: "/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/ventes", label: "Ventes", icon: Store },
];

export function TopTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/itna.webp"
            alt="ITNA Santé"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl object-contain"
            priority
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">ITNA Santé</p>
            <p className="text-[11px] text-slate-400">Centre de santé</p>
          </div>
        </Link>

        <nav className="flex gap-1 overflow-x-auto pb-0.5">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  active
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon strokeWidth={1.75} className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
