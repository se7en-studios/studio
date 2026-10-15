import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, History, Phone, ShieldCheck } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { parseMeetLink } from "@/lib/admin/calls";
import { notificationsConfigured } from "@/lib/admin/notify";
import { cn } from "../kit";
import { securityChecklist } from "../seguridad/checklist";
import { AdminGate, PageHeader } from "../ui";

export const metadata: Metadata = { title: "Ajustes" };

type Row = {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  status?: { text: string; ok: boolean };
};

// Lo que se configura una vez y se consulta poco: sale del menú y vive acá.
export default async function AjustesPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const checks = securityChecklist(me.who);
  const done = checks.filter((c) => c.ok).length;
  const notices = notificationsConfigured();
  const room = parseMeetLink(process.env[`MEET_LINK_${me.who.toUpperCase()}`]);

  const rows: Row[] = [
    {
      href: "/admin/seguridad",
      icon: <ShieldCheck size={16} />,
      title: "Seguridad",
      detail:
        "Contraseñas, segundo paso, cerrar sesiones y copia de seguridad.",
      status: {
        text: `${done} de ${checks.length}`,
        ok: done === checks.length,
      },
    },
    {
      href: "/admin/avisos",
      icon: <Bell size={16} />,
      title: "Avisos",
      detail: "Notificaciones al celular y el resumen de las 9.",
      status: { text: notices ? "Activados" : "Sin configurar", ok: notices },
    },
    {
      href: "/admin/llamadas",
      icon: <Phone size={16} />,
      title: "Llamadas",
      detail:
        "Sala fija de Meet, avisos en la compu y reuniones con clientes. Para llamar, el botón junto a tu cara.",
      status: {
        text: room ? "Sala fija lista" : "Sin sala fija",
        ok: room !== null,
      },
    },
    {
      href: "/admin/cambios",
      icon: <History size={16} />,
      title: "Registro",
      detail: "Quién cambió qué, con el antes y el después.",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes">
        Lo que se configura una vez: seguridad, avisos, llamadas y el registro
        de cambios.
      </PageHeader>
      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-card)]">
        {rows.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="focus-ring flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.025]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted">
                {r.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{r.title}</span>
                <span className="block text-[13px] text-muted">{r.detail}</span>
              </span>
              {r.status && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[12px]",
                    r.status.ok
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-amber-500/10 text-amber-300",
                  )}
                >
                  {r.status.text}
                </span>
              )}
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
