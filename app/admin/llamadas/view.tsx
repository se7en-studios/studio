"use client";

// Llamadas por Google Meet. Meet no se puede incrustar en el panel: se abre la sala en otra
// pestaña y se le avisa al otro (su panel suena en la computadora y le llega al celular).
// Con una sala fija propia es un clic; sin ella, se abre una sala nueva y se pega su link.
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { BellRing, Check, Copy, Phone, Video } from "lucide-react";
import { MEET_NEW, parseMeetLink } from "@/lib/admin/calls";
import type { LeadOwner } from "@/lib/admin/db";
import { Card, Face, btnPrimary, btnSecondary, cn, input } from "../kit";
import { useToast } from "../overlay";
import { ringPerson } from "./actions";

type Props = {
  me: LeadOwner;
  other: { id: LeadOwner; name: string };
  myRoom: string | null;
  otherHasRoom: boolean;
  noticesOn: boolean;
  personalTopic: boolean;
};

type Step = "idle" | "paste" | "sent";

const subscribeNone = () => () => {};
const permissionNow = (): NotificationPermission | "unsupported" =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

export function CallsView({
  me,
  other,
  myRoom,
  otherHasRoom,
  noticesOn,
  personalTopic,
}: Props) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <CallCard other={other} myRoom={myRoom} noticesOn={noticesOn} />
        <ClientMeeting myRoom={myRoom} />
      </div>
      <div className="space-y-4">
        <DesktopCard />
        <SetupCard
          me={me}
          myRoom={myRoom}
          otherHasRoom={otherHasRoom}
          noticesOn={noticesOn}
          personalTopic={personalTopic}
          otherName={other.name}
        />
      </div>
    </div>
  );
}

function CallCard({
  other,
  myRoom,
  noticesOn,
}: {
  other: Props["other"];
  myRoom: string | null;
  noticesOn: boolean;
}) {
  const flash = useToast();
  const [step, setStep] = useState<Step>("idle");
  const [link, setLink] = useState("");
  const [pending, start] = useTransition();

  function ring(room: string) {
    start(async () => {
      const res = await ringPerson(other.id, room);
      if (res.error) {
        flash(res.error, "error");
        return;
      }
      setStep("sent");
      flash(`Le avisamos a ${other.name}`, "ok");
    });
  }

  const pasted = parseMeetLink(link);

  return (
    <Card title={`Llamar a ${other.name}`} icon={<Phone size={14} />}>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--well-soft)] p-3.5">
          <span className="relative shrink-0 rounded-full p-0.5 ring-2 ring-accent/40 shadow-[0_0_28px_-6px_var(--accent)]">
            <Face who={other.id} size={52} />
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-semibold tracking-[-0.015em]">{other.name}</p>
            <p className="text-[12px] text-muted">
              Le suena el panel si lo tiene abierto, y le llega al celular.
            </p>
          </div>
        </div>

        {!noticesOn && (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-3 py-2 text-[13px] text-amber-300">
            Los avisos no están activados, así que {other.name} no se entera
            solo. Podés abrir la sala y mandarle el link por WhatsApp.{" "}
            <Link href="/admin/avisos" className="underline underline-offset-2">
              Activar avisos
            </Link>
          </p>
        )}

        {myRoom ? (
          // Un clic: la sala propia se abre (acción del navegador) y se avisa en paralelo.
          <a
            href={myRoom}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => ring(myRoom)}
            className={cn(btnPrimary, "w-full py-3 text-[14px]")}
          >
            <Phone size={15} /> Llamar a {other.name}
          </a>
        ) : (
          <>
            <a
              href={MEET_NEW}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setStep("paste")}
              className={cn(btnPrimary, "w-full py-3 text-[14px]")}
            >
              <Phone size={15} /> Abrir sala de Meet
            </a>
            {step !== "idle" && (
              <div>
                <label
                  htmlFor="meet-link"
                  className="mb-1 block font-mono text-[10.5px] tracking-[0.13em] text-muted uppercase"
                >
                  Pegá acá el link de la sala que se abrió
                </label>
                <div className="flex gap-2">
                  <input
                    id="meet-link"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="meet.google.com/abc-defg-hij"
                    className={input}
                  />
                  <button
                    type="button"
                    disabled={!pasted || pending}
                    onClick={() => pasted && ring(pasted)}
                    className={btnPrimary}
                  >
                    {pending ? "Avisando…" : `Avisar a ${other.name}`}
                  </button>
                </div>
                {link && !pasted && (
                  <p className="mt-1.5 text-[12px] text-red-400">
                    Ese no parece un link de Google Meet.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {step === "sent" && (
          <p className="flex items-center gap-2 text-[13px] text-emerald-300">
            <Check size={14} /> Aviso enviado a {other.name}. Ya podés entrar a
            la sala.
          </p>
        )}
      </div>
    </Card>
  );
}

function ClientMeeting({ myRoom }: { myRoom: string | null }) {
  const flash = useToast();
  async function copy() {
    if (!myRoom) return;
    try {
      await navigator.clipboard.writeText(myRoom);
      flash("Link copiado", "ok");
    } catch {
      flash("No se pudo copiar: seleccionalo a mano.", "error");
    }
  }
  return (
    <Card title="Reunión con un cliente" icon={<Video size={14} />}>
      <div className="space-y-3 p-4">
        <p className="text-[13px] text-muted">
          Abrí una sala y compartí el link por WhatsApp o mail. Si la abrís
          desde la ficha del pedido («Reunión por Meet»), queda anotada en su
          historial.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={MEET_NEW}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary}
          >
            <Video size={14} /> Nueva reunión
          </a>
          {myRoom && (
            <button type="button" onClick={copy} className={btnSecondary}>
              <Copy size={14} /> Copiar el link de mi sala
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function DesktopCard() {
  const flash = useToast();
  const stored = useSyncExternalStore(
    subscribeNone,
    permissionNow,
    () => "default" as const,
  );
  const [asked, setAsked] = useState<NotificationPermission | null>(null);
  const permission = asked ?? stored;

  async function ask() {
    try {
      setAsked(await Notification.requestPermission());
    } catch {
      flash("El navegador no dejó pedir el permiso.", "error");
    }
  }

  return (
    <Card
      title="Recibir llamadas en la computadora"
      icon={<BellRing size={14} />}
    >
      <div className="space-y-3 p-4">
        <p className="text-[13px] text-muted">
          Con el panel abierto en una pestaña, cuando te llaman aparece una
          ventana que suena con el botón «Unirme». Funciona en cualquier
          sección.
        </p>
        <ul className="space-y-1.5 text-[13px] text-muted">
          <li>
            Tocá la página una vez después de abrirla: el navegador no deja
            sonar antes.
          </li>
          <li>
            Si la pestaña está en segundo plano, además te llega un aviso del
            sistema (hay que permitirlo).
          </li>
        </ul>
        {permission === "unsupported" ? (
          <p className="text-[13px] text-muted">
            Este navegador no soporta avisos del sistema.
          </p>
        ) : permission === "granted" ? (
          <p className="flex items-center gap-2 text-[13px] text-emerald-300">
            <Check size={14} /> Avisos del sistema permitidos
          </p>
        ) : permission === "denied" ? (
          <p className="text-[13px] text-amber-300">
            Bloqueaste los avisos de este sitio. Se cambia desde el candado de
            la barra de direcciones.
          </p>
        ) : (
          <button type="button" onClick={ask} className={btnSecondary}>
            <BellRing size={14} /> Permitir avisos del sistema
          </button>
        )}
      </div>
    </Card>
  );
}

function SetupCard({
  me,
  myRoom,
  otherHasRoom,
  noticesOn,
  personalTopic,
  otherName,
}: {
  me: LeadOwner;
  myRoom: string | null;
  otherHasRoom: boolean;
  noticesOn: boolean;
  personalTopic: boolean;
  otherName: string;
}) {
  const rows = [
    {
      label: "Avisos activados",
      ok: noticesOn,
      hint: "Sin esto nadie se entera de una llamada.",
    },
    {
      label: "Tu sala fija de Meet",
      ok: myRoom !== null,
      hint: "Con una sala fija, llamar es un solo clic.",
    },
    {
      label: `Sala fija de ${otherName}`,
      ok: otherHasRoom,
      hint: "Cada uno carga la suya.",
    },
    {
      label: `Aviso solo para ${otherName}`,
      ok: personalTopic,
      hint: "Sin esto, la llamada le suena a los dos.",
    },
  ];
  const mine = `MEET_LINK_${me.toUpperCase()}`;
  return (
    <Card title="Configuración">
      <ul className="divide-y divide-[var(--line)]">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{r.label}</p>
              {!r.ok && (
                <p className="mt-0.5 text-[12px] text-muted">{r.hint}</p>
              )}
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                r.ok
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-white/[0.06] text-muted",
              )}
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
              {r.ok ? "Listo" : "Opcional"}
            </span>
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t border-[var(--line)] px-4 py-3 text-[12px] text-muted">
        <p>
          <b className="text-foreground">Sala fija:</b> en meet.google.com tocá
          «Nueva reunión» → «Crear una reunión para más tarde», copiá el link y
          cargalo en Vercel como{" "}
          <code className="rounded bg-white/[0.06] px-1 text-foreground">
            {mine}
          </code>
          .
        </p>
        <p>
          <b className="text-foreground">Aviso individual:</b> cada uno crea su
          propio tema en ntfy y lo carga como{" "}
          <code className="rounded bg-white/[0.06] px-1 text-foreground">
            NTFY_TOPIC_{me.toUpperCase()}
          </code>
          . La app de ntfy del celular se suscribe a ese.
        </p>
      </div>
    </Card>
  );
}
