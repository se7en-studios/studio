"use client";

import { useMemo } from "react";
import { ago, headline } from "@/lib/admin/brief";
import type { Lead } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { dealValue } from "@/lib/admin/metrics";
import { Face, cn, usd } from "../kit";
import { STAGE } from "./stages";

export function LeadTable({
  leads,
  lastContact,
  coldOf,
  onOpen,
  selected,
  onToggle,
  onSetSelected,
}: {
  leads: Lead[];
  lastContact: Map<string, string>;
  coldOf: (l: Lead) => number | null;
  onOpen: (id: string) => void;
  selected: string[];
  onToggle: (id: string) => void;
  onSetSelected: (ids: string[]) => void;
}) {
  const sorted = useMemo(() => [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)), [leads]);
  if (!sorted.length) return <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-12 text-center text-[13px] text-muted">Nada coincide.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-card)]">
      <table className="w-full text-left text-[13px] md:min-w-[860px]">
        <thead className="border-b border-[var(--line)] text-[12px] text-muted">
          <tr>
            <th className="w-10 py-2.5 pr-0 pl-4">
              <input
                type="checkbox"
                checked={sorted.length > 0 && sorted.every((l) => selected.includes(l.id))}
                onChange={(e) => onSetSelected(e.target.checked ? sorted.map((l) => l.id) : [])}
                aria-label="Elegir todos los pedidos que se ven"
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </th>
            <th className="px-2 py-2.5 font-medium">Pedido</th>
            <th className="px-3 py-2.5 font-medium">Etapa</th>
            <th className="max-md:hidden px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 text-right font-medium">Valor</th>
            <th className="max-md:hidden px-3 py-2.5 font-medium">Último contacto</th>
            <th className="max-md:hidden px-4 py-2.5 font-medium">Llegó</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {sorted.map((l) => {
            const cold = coldOf(l);
            const last = lastContact.get(l.id);
            return (
              <tr key={l.id} onClick={() => onOpen(l.id)} className={cn("cursor-pointer transition-colors hover:bg-white/[0.025]", selected.includes(l.id) && "bg-accent/[0.06]")}>
                <td className="w-10 py-2.5 pr-0 pl-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(l.id)}
                    onChange={() => onToggle(l.id)}
                    aria-label={`Elegir ${l.name}`}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </td>
                <td className="max-w-[360px] px-2 py-2.5 max-md:max-w-[180px]">
                  <button onClick={() => onOpen(l.id)} className="focus-ring block max-w-full text-left">
                    <span className="block truncate font-medium">
                      {l.name}
                      {l.company && <span className="font-normal text-muted"> · {l.company}</span>}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{headline(l.idea)}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STAGE[l.status].dot)} /> {STAGE[l.status].label}
                  </span>
                </td>
                <td className="max-md:hidden px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Face who={l.owner} size={18} alt="" /> {l.owner ? PEOPLE[l.owner].name : "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{dealValue(l) ? usd(dealValue(l)) : "—"}</td>
                <td className={cn("max-md:hidden px-3 py-2.5 text-[13px]", cold !== null ? "text-amber-300" : "text-muted")}>
                  {cold !== null ? `Frío · ${cold} días` : last ? ago(last) : "—"}
                </td>
                <td className="max-md:hidden px-4 py-2.5 text-[13px] text-muted">{ago(l.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
