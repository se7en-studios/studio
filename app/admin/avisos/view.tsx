"use client";

// Avisos al celular: estado, cómo activarlos (con un tema y un secreto sugeridos)
// y un botón para mandar un aviso de prueba.
import { useState, useTransition } from "react";
import { BellRing, Check, Copy, Download, RefreshCw, Send } from "lucide-react";
import { NOTE_MAX } from "@/lib/admin/digest";
import { Card, btnPrimary, btnSecondary, cn, input } from "../kit";
import { useToast } from "../overlay";
import { sendNote, sendTestNotice } from "./actions";

type Suggestion = { topic: string; secret: string };

type Props = {
  configured: boolean;
  topic: string | null;
  server: string;
  cronReady: boolean;
  suggestion: Suggestion;
  /** El otro socio: a quién va el aviso suelto y si tiene su propio tema. */
  partner: { name: string; personal: boolean };
};

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

const WHEN = [
  {
    what: "Pedido nuevo",
    when: "Al instante, cuando alguien llena el formulario de la web",
    cron: false,
  },
  {
    what: "Mensaje nuevo",
    when: "Cuando el otro te escribe en el chat del panel (sin el texto, y no más de uno por minuto por conversación)",
    cron: false,
  },
  {
    what: "Cobro registrado",
    when: "Cuando el otro anota un cobro en un proyecto (sin monto)",
    cron: false,
  },
  {
    what: "Tarea para vos",
    when: "Cuando el otro te pasa una tarea",
    cron: false,
  },
  {
    what: "Resumen del día",
    when: "Todos los días a las 9:00: posts, tareas vencidas y pedidos sin responder",
    cron: true,
  },
  {
    what: "Falta publicar",
    when: "Todos los días a las 18:30, solo si el post de las 19 h sigue sin publicarse",
    cron: true,
  },
];

export function NoticesView({
  configured,
  topic,
  server,
  cronReady,
  suggestion,
  partner,
}: Props) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Status configured={configured} cronReady={cronReady} />
        {configured && <SendNote name={partner.name} personal={partner.personal} />}
        {configured && topic ? (
          <Subscribe topic={topic} server={server} />
        ) : (
          <Activate initial={suggestion} />
        )}
      </div>
      <div className="space-y-4">
      <Card title="Qué avisa y cuándo">
        <ul className="divide-y divide-[var(--line)]">
          {WHEN.map((w) => (
            <li key={w.what} className="px-4 py-3">
              <p className="text-[13px] font-medium">{w.what}</p>
              <p className="mt-0.5 text-[13px] text-muted">{w.when}</p>
              {w.cron && !cronReady && (
                <p className="mt-1 text-[12px] text-amber-300">
                  Falta CRON_SECRET en Vercel para que se programe.
                </p>
              )}
            </li>
          ))}
        </ul>
        <p className="border-t border-[var(--line)] px-4 py-3 text-[12px] text-muted">
          Los avisos pasan por el servicio ntfy. Llevan solo cantidades y
          títulos de posts del estudio, nunca el nombre ni los datos de un
          cliente. Los de mensajes, cobros y tareas dicen de quién son, no su
          contenido. El aviso suelto lleva exactamente lo que escribís.
        </p>
      </Card>
      <BackupCard />
      </div>
    </div>
  );
}

/** Una copia de todo lo que el panel guarda en Supabase, para tener afuera si algo falla. */
function BackupCard() {
  return (
    <Card title="Copia de seguridad" icon={<Download size={14} />}>
      <div className="space-y-3 p-4">
        <p className="text-[13px] text-muted">
          Baja un archivo con los pedidos, proyectos, tareas, mensajes, finanzas, contenido y las cuentas (estas
          últimas siguen cifradas). El plan gratis de Supabase no hace copias solo: conviene bajar una una vez por
          mes.
        </p>
        <p className="text-[12px] text-muted">
          Lleva datos de clientes: guardala en un lugar privado y no la compartas. No incluye los archivos
          subidos a los proyectos, solo su lista.
        </p>
        <a href="/admin/api/respaldo" download className={btnSecondary}>
          <Download size={14} /> Descargar copia
        </a>
      </div>
    </Card>
  );
}

function Status({
  configured,
  cronReady,
}: {
  configured: boolean;
  cronReady: boolean;
}) {
  const rows = [
    {
      label: "Avisos al celular",
      ok: configured,
      on: "Activados",
      off: "Sin configurar",
    },
    {
      label: "Resumen y recordatorio programados",
      ok: configured && cronReady,
      on: "Activados",
      off: cronReady ? "Esperan los avisos" : "Falta CRON_SECRET",
    },
  ];
  return (
    <Card title="Estado">
      <ul className="divide-y divide-[var(--line)]">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]"
          >
            {r.label}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                r.ok
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-amber-400/10 text-amber-300",
              )}
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
              {r.ok ? r.on : r.off}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const flash = useToast();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      flash("No se pudo copiar: seleccionalo a mano.", "error");
    }
  }
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-[var(--line-strong)] bg-[var(--well)] px-3 py-2 text-[12px]">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copiar ${label}`}
          className={btnSecondary}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

/** Ya hay tema: cómo suscribir el celular y probar. */
function Subscribe({ topic, server }: { topic: string; server: string }) {
  const flash = useToast();
  const [pending, start] = useTransition();
  const custom = server !== "https://ntfy.sh";

  function test() {
    start(async () => {
      const res = await sendTestNotice();
      if (res.error) flash(res.error, "error");
      else flash("Aviso enviado: mirá el celular", "ok");
    });
  }

  return (
    <Card title="Recibirlos en el celular" icon={<BellRing size={14} />}>
      <div className="space-y-4 p-4">
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
          <li>
            Instalá la app <b className="text-foreground">ntfy</b> (Android:
            Play Store; iPhone: App Store).
          </li>
          <li>
            Tocá «+», y{" "}
            {custom
              ? "elegí «Usar otro servidor» con la dirección de abajo, y "
              : ""}
            escribí este tema:
          </li>
        </ol>
        <CopyField
          label="Tema (es el secreto: no lo compartas)"
          value={topic}
        />
        {custom && <CopyField label="Servidor" value={server} />}
        <button
          type="button"
          onClick={test}
          disabled={pending}
          className={btnPrimary}
        >
          <Send size={14} /> {pending ? "Enviando…" : "Enviar aviso de prueba"}
        </button>
      </div>
    </Card>
  );
}

/** Falta configurar: un tema y un secreto sugeridos, y qué cargar en Vercel. */
function Activate({ initial }: { initial: Suggestion }) {
  // La primera sugerencia viene del servidor (sin guardarse); «Generar otros» las rehace acá.
  const [suggest, setSuggest] = useState(initial);
  const generate = () =>
    setSuggest({
      topic: `se7en-panel-${randomHex(10)}`,
      secret: randomHex(24),
    });

  return (
    <Card title="Cómo activarlos" icon={<BellRing size={14} />}>
      <div className="space-y-4 p-4">
        <p className="text-[13px] text-muted">
          Se activan con dos variables en Vercel (Settings → Environment
          Variables). Estas son sugeridas y no se guardan en ningún lado.
        </p>
        {suggest && (
          <>
            <CopyField label="NTFY_TOPIC" value={suggest.topic} />
            <CopyField label="CRON_SECRET" value={suggest.secret} />
          </>
        )}
        <button type="button" onClick={generate} className={btnSecondary}>
          <RefreshCw size={14} /> Generar otros
        </button>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
          <li>Cargá las dos variables en Vercel y volvé a deployar.</li>
          <li>
            Entrá de nuevo a esta página: va a mostrar cómo suscribir el celular
            y el botón de prueba.
          </li>
        </ol>
      </div>
    </Card>
  );
}

/** Un aviso escrito a mano para el otro: le llega al celular (y le suena el panel abierto). */
function SendNote({ name, personal }: { name: string; personal: boolean }) {
  const flash = useToast();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function send() {
    start(async () => {
      const res = await sendNote(text);
      if (res.error) {
        flash(res.error, "error");
        return;
      }
      setText("");
      flash(`Aviso enviado a ${name}`, "ok");
    });
  }

  return (
    <Card title={`Mandarle un aviso a ${name}`} icon={<Send size={14} />}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() && !pending) send();
        }}
        className="space-y-3 p-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={NOTE_MAX}
          rows={3}
          placeholder="Ej.: mirá el pedido nuevo cuando puedas"
          aria-label={`Aviso para ${name}`}
          className={cn(input, "resize-none")}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted">
            {personal
              ? `Le llega solo a ${name}.`
              : `${name} no tiene su aviso propio: le llega a los dos.`}
          </p>
          <button type="submit" disabled={!text.trim() || pending} className={btnPrimary}>
            <Send size={14} /> {pending ? "Enviando…" : "Mandar"}
          </button>
        </div>
      </form>
    </Card>
  );
}
