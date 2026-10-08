"use client";

// Exportar pedidos a CSV (abre bien en Excel y Google Sheets).
import type { Lead } from "@/lib/admin/db";
import { dealValue } from "@/lib/admin/metrics";
import { PEOPLE } from "@/lib/admin/people";

const COLUMNS: [string, (l: Lead) => string | number][] = [
  ["Fecha", (l) => new Date(l.created_at).toLocaleDateString("es-AR")],
  ["Nombre", (l) => l.name],
  ["Empresa", (l) => l.company],
  ["Email", (l) => l.email],
  ["Teléfono", (l) => l.phone ?? ""],
  ["Etapa", (l) => l.status],
  ["Responsable", (l) => (l.owner ? PEOPLE[l.owner].name : "")],
  ["Llegó por", (l) => [l.source, l.channel].filter(Boolean).join(" · ")],
  ["Proyecto", (l) => l.project_type],
  ["Presupuesto", (l) => l.budget],
  ["Plazo", (l) => l.timeline],
  ["Monto acordado (USD)", (l) => l.value ?? ""],
  ["Valor estimado (USD)", (l) => Math.round(dealValue(l)) || ""],
  ["Idea", (l) => l.idea],
  ["Notas", (l) => l.notes],
];

/**
 * Comillas siempre, comillas internas duplicadas. Lo que empieza con = + - @
 * lleva un apóstrofo: si no, Excel lo ejecuta como fórmula (los datos vienen
 * de un formulario público).
 */
export function cell(v: string | number) {
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(leads: Lead[]) {
  const rows = [
    COLUMNS.map(([h]) => h),
    ...leads.map((l) => COLUMNS.map(([, get]) => get(l))),
  ];
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(leads: Lead[]) {
  // BOM: sin él Excel abre los acentos rotos.
  const blob = new Blob(["﻿", toCsv(leads)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos-se7en-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
