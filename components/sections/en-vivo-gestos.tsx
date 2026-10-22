"use client";

// Lo que comparten la oficina de la landing y el mapa del panel para el canal
// en vivo (lib/oficinas/vivo.ts): la ficha con los gestos para mandarle a
// alguien, el aviso de uno que te mandaron y las caras de los socios.
import Image from "next/image";
import { useEffect, useState } from "react";
import { Bell, Coffee, Hand, Heart, MessageCircle, X } from "lucide-react";
import { isOwner } from "@/lib/oficinas/art";
import type { Gesture, Heard, LivePerson } from "@/lib/oficinas/vivo";
import type { Who } from "@/lib/admin/oficinas-shared";
import { PEOPLE } from "@/lib/admin/people";

/** Lo que dice el aviso cuando alguien te manda un gesto. */
const HEARD: Record<Gesture, string> = { hola: "te saludó", corazon: "te mandó un corazón", cafe: "te convidó un café" };
const GESTURE_UI = [
  { g: "hola", label: "Saludar", Icon: Hand },
  { g: "corazon", label: "Corazón", Icon: Heart },
  { g: "cafe", label: "Café", Icon: Coffee },
] as const;
export const nameOf = (p: LivePerson | undefined) => p?.name ?? "Una visita";

/** El aviso de un gesto que te mandaron («Franco te saludó»): unos segundos y se va. */
export function useHeardLine(heard: Heard | null, people: LivePerson[]) {
  const [gone, setGone] = useState<number | null>(null);
  useEffect(() => {
    if (!heard) return;
    const t = window.setTimeout(() => setGone(heard.at), 4500);
    return () => window.clearTimeout(t);
  }, [heard]);
  if (!heard || gone === heard.at) return null;
  return `${nameOf(people.find((p) => p.id === heard.from))} ${HEARD[heard.g]}`;
}

/** Las caras de los socios (las fotos de la web), chiquitas, para marcar dónde está cada uno. */
export function Faces({ who, size = 18 }: { who: Who[]; size?: number }) {
  return (
    <span className="flex -space-x-1.5">
      {who.map((w) => {
        const p = PEOPLE[w];
        return p.image ? (
          <Image key={w} src={p.image} alt={p.name} width={size} height={size} className="rounded-full object-cover ring-2 ring-[#5ad1a8]" style={{ width: size, height: size }} />
        ) : null;
      })}
    </span>
  );
}

/** Un socio que no está mirando la oficina: si anda por el panel (`online`) y cómo avisarle que estás. */
export type Away = { online: boolean; onCall: () => Promise<"sent" | "again" | "fail"> };

const CALLED = {
  sending: "Avisando…",
  sent: "Listo: le llegó el aviso al celular. Si está cerca, entra a saludarte.",
  again: "Ya le avisaste hace un rato: dale unos minutos.",
  fail: "No se pudo avisar ahora. Escribile por WhatsApp.",
} as const;

const btn = (primary: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb199] disabled:opacity-50 ${
    primary ? "bg-[#ff4d2e] text-[#0b0b0c] hover:bg-[#ff6a4f]" : "bg-white/8 text-[#f2eee6] ring-1 ring-white/15 hover:bg-white/15"
  }`;

/**
 * La ficha de alguien (lo tocaste en el mapa, o el botón de un socio). En la
 * oficina: los gestos para mandarle (sin texto libre: saludar, un corazón o un
 * café); `onGesture` devuelve false si todavía no pasó el rato desde el
 * anterior. Un socio que no la está mirando (`away`): avisarle que estás, y le
 * llega al celular. A los socios, además, `whatsapp`: escribirles directo.
 */
export function PersonCard({
  person,
  onGesture,
  onClose,
  className,
  away,
  whatsapp,
  onWhatsApp,
}: {
  person: LivePerson;
  onGesture: (g: Gesture) => boolean;
  onClose: () => void;
  className: string;
  away?: Away | null;
  whatsapp?: string | null;
  onWhatsApp?: () => void;
}) {
  const [wait, setWait] = useState(false);
  const [called, setCalled] = useState<keyof typeof CALLED | null>(null);
  const owner = isOwner(person.look);
  const name = nameOf(person);
  const send = (g: Gesture) => {
    if (!onGesture(g)) return;
    setWait(true);
    window.setTimeout(() => setWait(false), 1200);
  };
  const call = async () => {
    if (!away || called === "sending") return;
    setCalled("sending");
    setCalled(await away.onCall());
  };
  const [kicker, dot] = !away ? ["En la oficina ahora", "#5ad1a8"] : away.online ? ["Conectado al panel", "#ffb199"] : ["No está conectado", "#8d8982"];
  return (
    <section
      aria-label={away ? `Avisarle a ${name}` : `Mandarle un gesto a ${name}`}
      className={`rounded-2xl bg-[rgba(21,21,23,0.96)] p-3.5 text-[#f2eee6] shadow-2xl ring-1 ring-white/10 ${className}`}
      style={{ boxShadow: `inset 0 3px 0 ${dot}, 0 20px 50px rgba(0,0,0,0.5)` }}
    >
      <div className="flex items-start gap-3">
        {owner && <Faces who={[person.look as Who]} size={40} />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: dot }}>
            <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden /> {kicker}
          </p>
          <h2 className="mt-0.5 text-[17px] leading-tight font-extrabold text-white">{name}</h2>
        </div>
        <button type="button" aria-label="Cerrar la ficha" onClick={onClose} className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#b9b4ab] hover:bg-white/10 hover:text-white">
          <X size={16} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-[#d9d4cb]" aria-live="polite">
        {called
          ? CALLED[called]
          : away
            ? away.online
              ? `${name} está trabajando en el panel, no en la oficina. Avisale que estás acá: le llega al celular.`
              : `${name} no está conectado ahora. Avisale que pasaste: le llega al celular.`
            : owner
              ? `${name} tiene la oficina abierta: lo que le mandes lo ve al toque.`
              : "Está mirando la oficina ahora: lo que le mandes lo ve al toque."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {away ? (
          <button type="button" disabled={called === "sending" || called === "sent"} onClick={() => void call()} className={btn(true)}>
            <Bell size={14} aria-hidden /> Avisale que estás acá
          </button>
        ) : (
          GESTURE_UI.map(({ g, label, Icon }, i) => (
            <button key={g} type="button" disabled={wait} onClick={() => send(g)} className={btn(i === 0)}>
              <Icon size={14} aria-hidden /> {label}
            </button>
          ))
        )}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={onWhatsApp} className={btn(false)}>
            <MessageCircle size={14} aria-hidden /> Hablale por WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}

/**
 * Un botón por socio para abrir su ficha (con el teclado no se puede tocar el
 * muñeco). `away`: los que no están mirando la oficina (se les avisa).
 */
export function FounderButtons({ people, onPick, className, away }: { people: LivePerson[]; onPick: (id: string) => void; className: string; away?: ReadonlySet<string> }) {
  const founders = people.filter((p) => isOwner(p.look));
  if (!founders.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {founders.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p.id)}
          className="flex h-9 items-center gap-2 rounded-xl bg-[rgba(11,11,12,0.9)] pr-3 pl-1.5 text-[13px] font-semibold text-[#f2eee6] ring-1 ring-[#ff4d2e]/50 transition-colors hover:bg-[#26262a] focus-visible:outline-2 focus-visible:outline-[#ffb199]"
        >
          <Faces who={[p.look as Who]} size={24} />
          {away?.has(p.id) ? `Hablar con ${nameOf(p)}` : `Saludar a ${nameOf(p)}`}
        </button>
      ))}
    </div>
  );
}
