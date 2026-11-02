// Las etapas del radar de prospectos: un solo lugar para el nombre, la leyenda y
// el color que usan los filtros, el tablero, la lista y la ficha.
import type { ProspectStatus } from "@/lib/admin/prospect-shared";

export const STAGES: {
  id: ProspectStatus;
  label: string;
  hint: string;
  dot: string;
}[] = [
  {
    id: "nuevo",
    label: "Sin contactar",
    hint: "Por escribir",
    dot: "bg-accent",
  },
  {
    id: "contactado",
    label: "Contactados",
    hint: "Esperando respuesta",
    dot: "bg-amber-400",
  },
  { id: "en_charla", label: "En charla", hint: "Hablando", dot: "bg-sky-400" },
  {
    id: "ganado",
    label: "Ganados",
    hint: "Cerrados con seña",
    dot: "bg-emerald-400",
  },
  {
    id: "descartado",
    label: "Descartados",
    hint: "No interesa",
    dot: "bg-zinc-500",
  },
  {
    id: "numero_equivocado",
    label: "Nº equivocado",
    hint: "Revisar el dato",
    dot: "bg-red-400",
  },
];

export const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<
  ProspectStatus,
  (typeof STAGES)[number]
>;

/** El valor ARS que se muestra al lado del USD (el mismo que usaba el radar). */
export const FX_RATE = 1350;
