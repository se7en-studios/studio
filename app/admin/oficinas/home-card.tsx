// Tarjeta de «En vivo» para Inicio: la sala más apagada y un atajo al mapa.
// Componente de servidor: recibe lo que calculó getSalaMasApagada.
import Link from "next/link";
import { Radio } from "lucide-react";
import { daysLabel, plantStage } from "@/lib/admin/oficinas-shared";
import type { SalaMasApagada } from "@/lib/admin/oficinas";
import { Card, CardLink, btnSecondary, cn } from "../kit";

const PLANT = ["la planta está bien", "la planta pide agua", "la planta se está secando", "la planta ya se secó"];

export function EnVivoCard({ sala }: { sala: SalaMasApagada }) {
  const allLit = sala.fade === 0;
  const on = Math.round((1 - sala.fade) * 8);
  return (
    <Card title="En vivo" icon={<Radio size={14} />} action={<CardLink href="/admin/oficinas">Entrar →</CardLink>}>
      <div className="flex items-center gap-4 px-4 py-4">
        <span className="flex h-12 items-end gap-[3px]" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className={cn("w-[5px] rounded-[1px]", i < on ? "" : "bg-[var(--line-strong)]")}
              style={{ height: `${30 + i * 9}%`, background: i < on ? sala.accent : undefined }}
            />
          ))}
        </span>
        <div className="min-w-0 flex-1">
          {allLit ? (
            <>
              <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Todas prendidas</p>
              <p className="mt-1 text-[15px] font-semibold text-foreground">Las {sala.total} salas tienen la luz prendida</p>
              <p className="mt-0.5 text-[12px] text-muted">Entrar a una sala la mantiene así; a los tres días sin pasar empieza a apagarse.</p>
            </>
          ) : (
            <>
              <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Sala más apagada</p>
              <p className="mt-1 truncate text-[15px] font-semibold text-foreground">{sala.name}</p>
              <p className="mt-0.5 text-[12px] text-muted">
                {sala.days === null ? "Nunca entraste" : `No entrás ${daysLabel(sala.days)}`}; {PLANT[plantStage(sala.fade)]}. {sala.lit} de {sala.total} prendidas.
              </p>
            </>
          )}
        </div>
        {!allLit && (
          <Link href="/admin/oficinas" className={cn(btnSecondary, "hidden shrink-0 sm:inline-flex")}>
            Ir
          </Link>
        )}
      </div>
    </Card>
  );
}
