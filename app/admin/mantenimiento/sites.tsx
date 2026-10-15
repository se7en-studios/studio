"use client";

// Los sitios en mantenimiento: abono, cobro del mes, horas, pedidos abiertos y
// salud. El plan de cada uno se edita en un diálogo.
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Server, X } from "lucide-react";
import { CURRENCIES, OWNERS, fmt } from "@/lib/admin/finance-shared";
import {
  CHARGE_STATE,
  type ChargeState,
  type HoursUsage,
  type Plan,
  type PlanInput,
} from "@/lib/admin/maintenance-shared";
import {
  ALERT_LABEL,
  healthLabel,
  type SiteAlert,
  type SiteCheck,
} from "@/lib/admin/site-health-shared";
import {
  Card,
  Empty,
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  cn,
  input,
  label,
} from "../kit";
import { Dialog, useToast } from "../overlay";
import { deletePlanAction, savePlanAction } from "./actions";

export type SiteRow = {
  slug: string;
  name: string;
  url: string | null;
  client: { id: string; name: string } | null;
  plan: Plan | null;
  charge: ChargeState | null;
  open: number;
  hours: HoursUsage;
  check: SiteCheck | null;
  alerts: SiteAlert[];
};

const alertText = (a: SiteAlert) =>
  a.days === undefined
    ? ALERT_LABEL[a.kind]
    : a.days < 0
      ? `${ALERT_LABEL[a.kind].split(" ")[0]} vencido`
      : `${ALERT_LABEL[a.kind]} (${a.days} d)`;

export function Sites({
  rows,
  candidates,
  today,
}: {
  rows: SiteRow[];
  candidates: { slug: string; name: string }[];
  today: string;
}) {
  const [editing, setEditing] = useState<{
    slug: string;
    name: string;
    plan: Plan | null;
  } | null>(null);

  return (
    <Card
      title="Sitios"
      icon={<Server size={14} />}
      count={rows.length}
      action={
        candidates.length > 0 && (
          <select
            aria-label="Agregar un plan"
            value=""
            onChange={(e) => {
              const p = candidates.find((c) => c.slug === e.target.value);
              if (p) setEditing({ ...p, plan: null });
            }}
            className={cn(input, "w-auto py-1 text-[12px]")}
          >
            <option value="">+ Plan para…</option>
            {candidates.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )
      }
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="text-[11px] tracking-wide text-muted uppercase">
              <tr className="border-b border-[var(--line)]">
                <th className="px-4 py-2 font-medium">Sitio</th>
                <th className="px-3 py-2 font-medium">Abono</th>
                <th className="px-3 py-2 font-medium">Cobro del mes</th>
                <th className="px-3 py-2 font-medium">Horas</th>
                <th className="px-3 py-2 font-medium">Pedidos</th>
                <th className="px-3 py-2 font-medium">Salud</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {rows.map((r) => (
                <tr key={r.slug} className="align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/proyectos/${r.slug}`}
                      className="focus-ring font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.client && (
                      <Link
                        href={`/admin/clientes/${r.client.id}`}
                        className="focus-ring block text-[12px] text-muted hover:text-foreground"
                      >
                        {r.client.name}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {r.plan ? (
                      <>
                        {fmt(r.plan.amount, r.plan.currency)}
                        <span className="block text-[12px] text-muted">
                          {r.plan.active
                            ? `día ${r.plan.billing_day}`
                            : "Pausado"}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">Sin plan</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3",
                      r.charge ? CHARGE_STATE[r.charge].tone : "text-muted",
                    )}
                  >
                    {r.charge ? CHARGE_STATE[r.charge].label : "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 tabular-nums",
                      r.hours.over && "text-red-400",
                    )}
                  >
                    {r.hours.used.toLocaleString("es-AR")}
                    {r.hours.included !== null
                      ? ` / ${r.hours.included.toLocaleString("es-AR")} h`
                      : " h"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 tabular-nums",
                      r.open ? "text-amber-300" : "text-muted",
                    )}
                  >
                    {r.open || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        !r.url
                          ? "text-muted"
                          : r.check && !r.check.ok
                            ? "text-red-400"
                            : undefined,
                      )}
                    >
                      {r.url ? healthLabel(r.check ?? undefined) : "Sin sitio"}
                    </span>
                    {r.alerts
                      .filter((a) => a.kind !== "caido")
                      .map((a) => (
                        <span
                          key={a.kind}
                          className="block text-[12px] text-amber-300"
                        >
                          {alertText(a)}
                        </span>
                      ))}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() =>
                        setEditing({ slug: r.slug, name: r.name, plan: r.plan })
                      }
                      className={btnGhost}
                      aria-label={`${r.plan ? "Editar" : "Crear"} el plan de ${r.name}`}
                    >
                      {r.plan ? <Pencil size={13} /> : <Plus size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={<Server size={18} />}
          title="Ningún sitio en mantenimiento"
        >
          Agregá el plan de un proyecto con «+ Plan para…».
        </Empty>
      )}
      {editing && (
        <PlanDialog
          {...editing}
          today={today}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function PlanDialog({
  slug,
  name,
  plan,
  today,
  onClose,
}: {
  slug: string;
  name: string;
  plan: Plan | null;
  today: string;
  onClose: () => void;
}) {
  const flash = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState<
    Partial<Omit<PlanInput, "amount" | "hours_included">> & {
      amount?: number | string;
      hours_included?: number | string | null;
    }
  >(
    plan ?? {
      amount: "",
      currency: "USD",
      billing_day: 10,
      includes: "",
      hours_included: "",
      active: true,
      start_date: today,
      owner: "ambos",
      domain_expires_on: null,
    },
  );
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));

  const done = (r: { error?: string }) => {
    if (r.error) return setError(r.error);
    flash("Plan guardado");
    onClose();
    router.refresh();
  };

  return (
    <Dialog onClose={onClose} label={`Plan de ${name}`}>
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () =>
            done(await savePlanAction(slug, v as Partial<PlanInput>)),
          );
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] text-muted">Plan de mantenimiento</p>
            <h2 className="mt-0.5 text-[20px] font-semibold">{name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancelar"
            className="focus-ring rounded-lg p-1.5 text-muted hover:bg-white/[0.06] hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Abono</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={v.amount ?? ""}
              onChange={(e) => set({ amount: e.target.value })}
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>Moneda</span>
            <select
              value={v.currency}
              onChange={(e) =>
                set({ currency: e.target.value as PlanInput["currency"] })
              }
              className={input}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Día de cobro</span>
            <input
              type="number"
              min={1}
              max={28}
              value={v.billing_day ?? ""}
              onChange={(e) => set({ billing_day: Number(e.target.value) })}
              className={input}
            />
          </label>
          <label className="block sm:col-span-3">
            <span className={label}>Qué incluye</span>
            <input
              maxLength={500}
              value={v.includes ?? ""}
              onChange={(e) => set({ includes: e.target.value })}
              placeholder="Hosting, dominio, cambios menores, backups…"
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>Horas por mes</span>
            <input
              type="number"
              min={0}
              step="0.5"
              value={v.hours_included ?? ""}
              onChange={(e) => set({ hours_included: e.target.value })}
              placeholder="Sin tope"
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>Inicio</span>
            <input
              type="date"
              value={v.start_date ?? ""}
              onChange={(e) => set({ start_date: e.target.value })}
              className={cn(input, "[color-scheme:dark]")}
            />
          </label>
          <label className="block">
            <span className={label}>Cobra</span>
            <select
              value={v.owner}
              onChange={(e) =>
                set({ owner: e.target.value as PlanInput["owner"] })
              }
              className={input}
            >
              {OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o === "ambos" ? "Los dos" : o[0].toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>
              Vence el dominio (si el chequeo no lo encuentra)
            </span>
            <input
              type="date"
              value={v.domain_expires_on ?? ""}
              onChange={(e) =>
                set({ domain_expires_on: e.target.value || null })
              }
              className={cn(input, "[color-scheme:dark]")}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-[13px]">
            <input
              type="checkbox"
              checked={v.active !== false}
              onChange={(e) => set({ active: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Activo
          </label>
        </div>
        <p className="mt-3 text-[12px] text-muted">
          Cada mes se genera solo un cobro pendiente en Finanzas para el día de
          cobro. Pausado no genera; al reactivarlo arranca desde ese mes.
        </p>
        {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          {plan ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                confirm(
                  `¿Sacar el plan de ${name}? Los cobros ya generados quedan en Finanzas.`,
                ) && start(async () => done(await deletePlanAction(slug)))
              }
              className={btnDanger}
            >
              Sacar plan
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
