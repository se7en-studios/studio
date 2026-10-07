// Quién es quién en el panel. Nombre y foto salen de data/team.ts.
// Se puede importar desde componentes de cliente: de db.ts sólo toma el tipo.
import { team } from "@/data/team";
import type { LeadOwner } from "./db";

export const PEOPLE: Record<LeadOwner, { name: string; image: string | null }> = {
  franco: { name: "Franco", image: team.find((t) => /franco/i.test(t.name ?? ""))?.imageUrl ?? null },
  federico: { name: "Federico", image: team.find((t) => /federico/i.test(t.name ?? ""))?.imageUrl ?? null },
};

export const PEOPLE_IDS = Object.keys(PEOPLE) as LeadOwner[];
