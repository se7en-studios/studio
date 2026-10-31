"use client";

import { Dialog } from "./overlay";
import { Kbd } from "./kit";
import {
  Command,
  Compass,
  FolderKanban,
  Target,
  Wallet,
  CheckSquare,
  MessagesSquare,
  Users,
  Radio,
  Keyboard,
  Sparkles,
} from "lucide-react";

type ShortcutRow = {
  keys: string[];
  label: string;
  desc: string;
  icon?: React.ReactNode;
};

const NAV_SHORTCUTS: ShortcutRow[] = [
  { keys: ["G", "P"], label: "Proyectos", desc: "Ir a Proyectos & Telemetría Edge", icon: <FolderKanban size={15} /> },
  { keys: ["G", "L"], label: "Prospectos", desc: "Ir al Radar de Prospectos & Kanban", icon: <Target size={15} /> },
  { keys: ["G", "F"], label: "Finanzas", desc: "Ir al Cockpit Financiero & Runway", icon: <Wallet size={15} /> },
  { keys: ["G", "T"], label: "Tareas", desc: "Ir al Sprint & Gestión de Tareas", icon: <CheckSquare size={15} /> },
  { keys: ["G", "M"], label: "Mensajes", desc: "Ir al Chat Interno del Estudio", icon: <MessagesSquare size={15} /> },
  { keys: ["G", "C"], label: "Clientes", desc: "Ir al Directorio de Clientes", icon: <Users size={15} /> },
  { keys: ["G", "O"], label: "Oficinas Virtuales", desc: "Ir al Virtual Studio HQ en Tiempo Real", icon: <Radio size={15} /> },
];

const GLOBAL_SHORTCUTS: ShortcutRow[] = [
  { keys: ["⌘", "K"], label: "Paleta Universal", desc: "Búsqueda difusa y comandos rápidos Raycast", icon: <Command size={15} /> },
  { keys: ["⌘", "B"], label: "Barra Lateral", desc: "Expandir o colapsar el menú lateral", icon: <Compass size={15} /> },
  { keys: ["?"], label: "Atajos de Teclado", desc: "Abrir esta cabina de asistencia", icon: <Keyboard size={15} /> },
  { keys: ["Esc"], label: "Cerrar Capa", desc: "Cerrar modal, drawer o búsqueda activa" },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} label="Atajos de Teclado" width="max-w-2xl">
      <div className="border-b border-[var(--line)] px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--well)] text-accent">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="adm-title text-[18px] text-foreground">Atajos de Teclado del Estudio</h2>
            <p className="text-[12px] text-muted">Velocidad táctil Linear-grade para operar Se7en OS sin levantar las manos del teclado.</p>
          </div>
        </div>
      </div>

      <div className="admin-scroll max-h-[65dvh] overflow-y-auto p-6 space-y-6">
        {/* Navegación rápida de dos teclas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="adm-label text-[11px] text-muted">Navegación Relámpago (Secuencia G + Tecla)</span>
            <span className="text-[11px] text-muted">Presiona 'G' y luego la letra</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {NAV_SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--well)] p-2.5 transition-colors hover:border-[var(--line-strong)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0 text-muted">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="adm-title text-[13px] text-foreground truncate">{s.label}</p>
                    <p className="text-[11px] text-muted truncate">{s.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comandos Globales */}
        <div>
          <span className="adm-label text-[11px] text-muted block mb-3">Comandos Globales de Sistema</span>
          <div className="space-y-2">
            {GLOBAL_SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--well)] p-2.5 transition-colors hover:border-[var(--line-strong)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.icon && <span className="shrink-0 text-muted">{s.icon}</span>}
                  <div className="min-w-0">
                    <p className="adm-title text-[13px] text-foreground truncate">{s.label}</p>
                    <p className="text-[11px] text-muted truncate">{s.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--line)] px-6 py-3.5 bg-[var(--well)] text-[12px] text-muted">
        <span>Consejo: Presiona <Kbd>?</Kbd> en cualquier momento para invocar este panel.</span>
        <button
          onClick={onClose}
          className="focus-ring rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-foreground hover:bg-[var(--line)] transition-colors"
        >
          Entendido
        </button>
      </div>
    </Dialog>
  );
}

