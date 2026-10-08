"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { logout } from "./actions";

const TABS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/proyectos", label: "Proyectos" },
  { href: "/admin/marca", label: "Marca" },
  { href: "/admin/cambios", label: "Cambios" },
];

export function PanelNav({ who }: { who: LeadOwner }) {
  const pathname = usePathname();
  const me = PEOPLE[who];
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Secciones del panel" className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:max-w-full md:px-0">
        <div className="flex w-max rounded-full border border-border bg-surface p-1 text-sm">
          {TABS.map((t) => {
            const on = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`focus-ring flex items-center gap-1.5 rounded-full px-4 py-1.5 whitespace-nowrap transition-colors ${
                  on ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {on && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3.5 pl-1 text-sm text-foreground">
          {me.image && <Image src={me.image} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-full object-cover" />}
          {me.name}
        </span>
        <form action={logout}>
          <button className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-foreground">
            <LogOut size={14} /> Salir
          </button>
        </form>
      </div>
    </div>
  );
}
