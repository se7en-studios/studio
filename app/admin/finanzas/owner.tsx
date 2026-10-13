"use client";

// De quién es un movimiento o una herramienta: caras de los socios y el selector de los formularios.
import { OWNERS, type Owner } from "@/lib/admin/finance-shared";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { Chip, Face } from "../kit";

export const OWNER_LABEL: Record<Owner, string> = {
  ambos: "Cuenta del estudio",
  franco: PEOPLE.franco.name,
  federico: PEOPLE.federico.name,
};

/** Una cara por socio; «ambos» muestra las dos juntas. */
export function OwnerFaces({
  owner,
  size = 18,
}: {
  owner: Owner;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 -space-x-1.5"
      title={OWNER_LABEL[owner]}
    >
      {(owner === "ambos" ? PEOPLE_IDS : [owner]).map((who) => (
        <Face key={who} who={who} size={size} ring alt="" />
      ))}
      <span className="sr-only">{OWNER_LABEL[owner]}</span>
    </span>
  );
}

export function OwnerPicker({
  value,
  onChange,
  legend,
}: {
  value: Owner;
  onChange: (o: Owner) => void;
  legend: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={legend}>
      {OWNERS.map((o) => (
        <Chip key={o} on={value === o} onClick={() => onChange(o)}>
          {OWNER_LABEL[o]}
        </Chip>
      ))}
    </div>
  );
}
