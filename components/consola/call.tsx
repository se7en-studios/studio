"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Hand, MessageSquare, Mic, MicOff, SmilePlus, Video, VideoOff } from "lucide-react";
import { team } from "@/data/team";
import { projects } from "@/data/projects";
import { CsSection, useConsola } from "@/components/consola/section";

// Equipo: el estudio como una videollamada. Los dos fundadores, alguien
// compartiendo pantalla y un lugar vacío para vos. Sumarse abre el formulario.

// Los dos fundadores, con foto (team los trae en ese orden).
const [franco, federico] = team.map((t) => ({ name: t.name ?? "Se7en", src: t.imageUrl ?? "" }));
const apex = projects.find((p) => p.slug === "apex-ai");
const REACTIONS = ["🧉", "🔥", "👏", "🚀", "✨"];

export function CsCall() {
  const { openTalk } = useConsola();
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [hand, setHand] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; e: string; x: number }[]>([]);
  const n = useRef(0);
  const seconds = useCallTimer();

  const react = () => {
    const id = ++n.current;
    const e = REACTIONS[id % REACTIONS.length];
    setBursts((b) => [...b, { id, e, x: 35 + Math.random() * 30 }]);
    window.setTimeout(() => setBursts((b) => b.filter((r) => r.id !== id)), 2300);
  };

  return (
    <CsSection id="equipo" label="Equipo" className="pt-28 md:pt-40">
      <div className="relative overflow-hidden rounded-(--cs-radius) border border-(--paper)/10 bg-[#09090a]">
        <div className="relative h-[780px] md:h-[620px]">
          <Tile
            className="top-[2%] left-[-5%] w-[56%] rotate-[-5deg] md:top-[6%] md:left-[2%] md:w-[24%]"
            name={franco.name}
            role="Desarrollo"
            delay="0s"
          >
            <Image src={franco.src} alt={franco.name} fill sizes="(min-width: 768px) 25vw, 60vw" className="object-cover" />
          </Tile>
          <Tile
            className="top-[73%] right-[-5%] w-[58%] rotate-[4deg] md:top-[5%] md:right-[2%] md:w-[24%]"
            name={federico.name}
            role="Producto y diseño"
            delay="-2s"
          >
            <Image src={federico.src} alt={federico.name} fill sizes="(min-width: 768px) 25vw, 60vw" className="object-cover" />
          </Tile>
          {apex && (
            <Tile
              className="top-[60%] left-[3%] hidden w-[26%] rotate-[3deg] md:block"
              name="Federico está presentando"
              role={apex.name}
              delay="-4s"
            >
              <Image src={apex.image} alt="" fill sizes="30vw" className="object-cover object-top" />
            </Tile>
          )}
          <Tile
            className="top-[7%] right-[-8%] w-[46%] rotate-[6deg] md:top-[58%] md:right-[4%] md:w-[22%]"
            name="Vos"
            role={hand ? "Levantó la mano ✋" : "Tu proyecto"}
            delay="-1s"
            muted={!mic}
          >
            <span className="absolute inset-0 grid place-items-center bg-[#151517]">
              <span className="cs-cond grid h-20 w-20 place-items-center rounded-full border border-dashed border-(--signal)/60 bg-(--signal)/10 text-[1.8rem] text-(--signal)">
                {cam ? "😀" : "VOS"}
              </span>
            </span>
          </Tile>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h2 className="cs-h2 max-w-[13ch] text-[clamp(2.2rem,3.6vw,3.5rem)] md:max-w-[44%]">
              Dos fundadores. <span className="rd-serif text-(--signal)">Cero</span> intermediarios.
            </h2>
            <p className="rd-body mt-4 max-w-[34ch] text-[15px] text-(--paper)/65">
              Hablás directo con quien diseña y con quien programa tu proyecto, de la primera llamada al lanzamiento.
            </p>
          </div>

          {bursts.map((b) => (
            <span
              key={b.id}
              aria-hidden
              className="cs-react pointer-events-none absolute bottom-24 text-4xl"
              style={{ left: `${b.x}%` }}
            >
              {b.e}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-(--paper)/[0.07] p-4 md:justify-between md:px-6">
          <span className="rd-label hidden items-center gap-2 rounded-full bg-(--paper)/[0.06] px-4 py-3 text-[10px] text-(--paper)/70 md:flex">
            <span className="cs-rec h-2 w-2 rounded-full bg-(--signal)" aria-hidden />
            Llamada con Se7en ·{" "}
            <span className="tabular-nums">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CallButton label={mic ? "Silenciar" : "Activar micrófono"} on={mic} onClick={() => setMic((v) => !v)}>
              {mic ? <Mic size={18} /> : <MicOff size={18} />}
            </CallButton>
            <CallButton label={cam ? "Apagar cámara" : "Prender cámara"} on={cam} onClick={() => setCam((v) => !v)}>
              {cam ? <Video size={18} /> : <VideoOff size={18} />}
            </CallButton>
            <CallButton label="Mandar una reacción" onClick={react}>
              <SmilePlus size={18} />
            </CallButton>
            <CallButton label={hand ? "Bajar la mano" : "Levantar la mano"} on={hand} onClick={() => setHand((v) => !v)}>
              <Hand size={18} />
            </CallButton>
            <button
              type="button"
              onClick={openTalk}
              className="rd-body h-12 basis-full rounded-full bg-(--signal) px-6 text-[15px] font-medium whitespace-nowrap text-(--ink) transition-colors hover:bg-(--paper) sm:ml-1 sm:basis-auto"
            >
              Sumate a la llamada
            </button>
          </div>
          <button
            type="button"
            onClick={openTalk}
            aria-label="Escribirnos"
            className="hidden h-12 w-12 place-items-center rounded-full bg-(--paper)/[0.08] text-(--paper)/80 md:grid"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </CsSection>
  );
}

/** Cronómetro de la llamada, desde que la sección entra en la página. */
function useCallTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setS((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return s;
}

function Tile({
  className,
  name,
  role,
  delay,
  muted = false,
  children,
}: {
  className: string;
  name: string;
  role: string;
  delay: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className={`absolute ${className}`}>
      <div className="cs-bob" style={{ animationDelay: delay }}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#151517] shadow-[0_30px_60px_-25px_#000] ring-1 ring-white/10">
          {children}
          <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
            <span className="rd-body truncate rounded-lg bg-black/55 px-2.5 py-1 text-[12px] text-white backdrop-blur">
              {name} <span className="text-white/55">· {role}</span>
            </span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/55 text-white backdrop-blur" aria-hidden>
              {muted ? <MicOff size={13} /> : <Mic size={13} />}
            </span>
          </figcaption>
        </div>
      </div>
    </figure>
  );
}

function CallButton({
  label,
  on = false,
  onClick,
  children,
}: {
  label: string;
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={`grid h-12 w-12 place-items-center rounded-full transition-colors ${
        on ? "bg-(--paper) text-(--ink)" : "bg-(--paper)/[0.08] text-(--paper)/85 hover:bg-(--paper)/15"
      }`}
    >
      {children}
    </button>
  );
}
