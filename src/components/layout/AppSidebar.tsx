"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const tabs = [
  { href: "/", label: "Dashboard", icon: "/icons/dashboard.svg" },
  { href: "/patients", label: "Patients", icon: "/icons/patients.svg" },
  { href: "/maladies", label: "Maladies", icon: "/icons/maladies.svg" },
  {
    href: "/geographie",
    label: "Données géographiques",
    icon: "/icons/villes.svg",
  },
  { href: "/produits", label: "Produits", icon: "/icons/produits.svg" },
  { href: "/commandes", label: "Commandes", icon: "/icons/commandes.svg" },
  { href: "/ventes", label: "Ventes", icon: "/icons/ventes.svg" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {tabs.map(({ href, label, icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href) ||
              (href === "/geographie" && pathname.startsWith("/villes"));

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-white/95 text-emerald-800 shadow-md shadow-emerald-950/20"
                : "text-emerald-50/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl transition ${
                active ? "ring-2 ring-white/60" : "opacity-90 group-hover:opacity-100"
              }`}
            >
              <Image
                src={icon}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9"
                unoptimized
              />
            </span>
            <span className="leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-4 py-5">
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/25">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/itna.webp"
          alt="ITNA Santé"
          className="h-10 w-10 rounded-xl object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const sibling = e.currentTarget
              .nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "flex";
          }}
        />
        <span className="hidden h-10 w-10 items-center justify-center text-sm font-bold text-white">
          IT
        </span>
      </div>
      <div>
        <p
          className={`text-sm font-semibold ${light ? "text-white" : "text-slate-900"}`}
        >
          ITNA Santé
        </p>
        <p
          className={`text-[11px] ${light ? "text-emerald-100/70" : "text-slate-400"}`}
        >
          Centre de santé
        </p>
      </div>
    </Link>
  );
}

function FlaticonCredit() {
  return (
    <p className="px-4 pb-4 pt-2 text-[9px] leading-relaxed text-emerald-100/45">
      Icônes 2D :{" "}
      <a
        href="https://www.flaticon.com"
        target="_blank"
        rel="noreferrer"
        className="underline decoration-emerald-100/30 underline-offset-2 hover:text-emerald-50"
      >
        Flaticon
      </a>
    </p>
  );
}

const sidebarBg =
  "bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-900";

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-emerald-800/20 bg-gradient-to-r from-emerald-600 to-teal-700 px-2 py-2 lg:hidden">
        <Brand light />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mr-2 rounded-xl p-2 text-white hover:bg-white/10"
          aria-label="Ouvrir le menu"
        >
          <Menu strokeWidth={1.75} className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <aside
            className={`relative flex h-full w-[min(100%,19rem)] flex-col shadow-2xl ${sidebarBg}`}
          >
            <div className="flex items-center justify-between pr-2">
              <Brand light />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-emerald-100 hover:bg-white/10"
              >
                <X strokeWidth={1.75} className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <FlaticonCredit />
            </div>
          </aside>
        </div>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-60 flex-col lg:flex ${sidebarBg}`}
      >
        <Brand light />
        <NavLinks />
        <div className="mt-auto">
          <FlaticonCredit />
        </div>
      </aside>
    </>
  );
}
