"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Hand, MousePointer2, PenTool, Sparkles, Square, Type, Frame } from "lucide-react";
import { RdButton } from "@/components/rd/primitives";
import { CsSection } from "@/components/consola/section";

// Piezas: un lienzo de editor con componentes de proyectos reales, hechos en
// código, que se arrastran. Dos cursores con nombre andan dando vueltas.

type Piece = {
  id: string;
  layer: string;
  /** Posición inicial en escritorio y en celular (en % del lienzo); `mobile: false` la saca del celular. */
  at: { x: string; y: string; mx: string; my: string; mobile?: false };
  body: ReactNode;
};

const PIECES: Piece[] = [
  {
    id: "turno",
    layer: "Muzzaga_Turno",
    at: { x: "4%", y: "9%", mx: "-8%", my: "3%" },
    body: (
      <div className="w-[236px] rounded-2xl bg-[#17120e] p-4 text-[#f6efe6] ring-1 ring-[#E8722A]/40">
        <p className="rd-label text-[9px] text-[#E8722A]">Cancha 2 · Hoy</p>
        <p className="rd-body mt-1 text-[15px]">Elegí tu horario</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {["18:00", "19:30", "21:00"].map((h) => (
            <span
              key={h}
              className={`rd-body rounded-lg py-1.5 text-center text-[12px] ${
                h === "19:30" ? "bg-[#E8722A] text-black" : "bg-white/[0.07]"
              }`}
            >
              {h}
            </span>
          ))}
        </div>
        <span className="rd-body mt-3 block rounded-lg bg-white py-2 text-center text-[12.5px] font-medium text-black">
          Reservar con seña
        </span>
      </div>
    ),
  },
  {
    id: "pedido",
    layer: "Takefyy_Pedido",
    at: { x: "9%", y: "62%", mx: "-12%", my: "79%" },
    body: (
      <div className="w-[230px] rounded-2xl bg-[#fbf7f2] p-4 text-[#1b1410]">
        <div className="flex items-center justify-between">
          <p className="rd-body text-[14px] font-medium">Pedido #128</p>
          <span className="rd-label rounded-full bg-[#FF6B2C]/15 px-2 py-0.5 text-[9px] text-[#c4471a]">Nuevo</span>
        </div>
        <ul className="rd-body mt-2 space-y-1 text-[12.5px] text-black/70">
          <li className="flex justify-between">
            <span>2× Lomito completo</span>
          </li>
          <li className="flex justify-between">
            <span>1× Papas rústicas</span>
          </li>
        </ul>
        <span className="rd-body mt-3 block rounded-lg bg-[#25D366] py-2 text-center text-[12.5px] font-medium text-black">
          Enviar por WhatsApp
        </span>
      </div>
    ),
  },
  {
    id: "stock",
    layer: "PoneLaPava_Stock",
    at: { x: "72%", y: "6%", mx: "60%", my: "-1%" },
    body: (
      <div className="w-[200px] overflow-hidden rounded-2xl bg-[#efe5d4] text-[#2b2116]">
        <div className="relative h-24 bg-[radial-gradient(circle_at_50%_70%,#C8A46E,#8a6a3f)]">
          <span className="rd-label absolute top-2 left-2 rounded-full bg-[#2b2116] px-2 py-0.5 text-[9px] text-[#efe5d4]">
            Quedan 3
          </span>
        </div>
        <div className="p-3">
          <p className="rd-body text-[14px] font-medium">Mate Imperial</p>
          <p className="rd-body text-[12px] text-black/55">Calabaza y virola de alpaca</p>
        </div>
      </div>
    ),
  },
  {
    id: "alerta",
    layer: "Sentinel_Alerta",
    at: { x: "76%", y: "44%", mx: "0%", my: "0%", mobile: false },
    body: (
      <div className="flex w-[210px] items-center gap-3 rounded-2xl bg-[#0d1a14] p-3.5 text-[#dff8ea] ring-1 ring-[#94F1BE]/30">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#94F1BE]/10">
          <span className="rd-ping absolute inset-2 rounded-full bg-[#ff5a3c]/60" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#ff5a3c]" />
        </span>
        <span>
          <span className="rd-body block text-[13.5px]">Foco detectado</span>
          <span className="rd-label block text-[9px] text-[#94F1BE]">Hace 4 min · satélite</span>
        </span>
      </div>
    ),
  },
  {
    id: "semana",
    layer: "Apex_Semana",
    at: { x: "68%", y: "70%", mx: "52%", my: "81%" },
    body: (
      <div className="w-[230px] rounded-2xl bg-[#F5C400] p-4 text-black">
        <p className="rd-label text-[9px]">Semana 3 · Acumulación</p>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {[40, 62, 55, 78, 70, 90, 30].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-black/85" style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className="rd-body mt-2 text-[12px] text-black/70">Volumen +12% vs. la anterior</p>
      </div>
    ),
  },
  {
    id: "cotizador",
    layer: "Se7en_Cotizador",
    at: { x: "36%", y: "3%", mx: "0%", my: "0%", mobile: false },
    body: (
      <div className="w-[220px] rounded-2xl bg-(--signal) p-4 text-(--ink)">
        <p className="rd-label text-[9px]">Cotizador</p>
        <p className="rd-body mt-1 text-[14px] font-medium">Tienda online</p>
        <div className="relative mt-3 h-1.5 rounded-full bg-black/20">
          <span className="absolute inset-y-0 left-0 w-[58%] rounded-full bg-black" />
          <span className="absolute top-1/2 left-[58%] h-4 w-4 -translate-1/2 rounded-full border-2 border-black bg-(--signal)" />
        </div>
        <p className="rd-label mt-3 text-[9px]">Online en 2–3 semanas</p>
      </div>
    ),
  },
];

export function CsPlayground() {
  const [selected, setSelected] = useState<string | null>(null);
  const top = useRef(10);

  return (
    <CsSection id="piezas" label="Piezas" className="pt-28 md:pt-40">
      <div className="cs-canvas relative h-[740px] overflow-hidden rounded-(--cs-radius) border border-(--paper)/[0.07] md:h-[680px]">
        <p className="rd-body pointer-events-none absolute bottom-7 left-6 hidden items-center gap-2 text-[13px] whitespace-nowrap text-(--paper)/55 md:flex">
          <Hand size={15} aria-hidden /> Arrastrá las piezas
        </p>

        <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center">
          <p className="rd-body mb-4 flex items-center gap-2 text-[13px] text-(--paper)/55 md:hidden">
            <Hand size={15} aria-hidden /> Arrastrá las piezas
          </p>
          <h2 className="cs-h2 max-w-[13ch] text-[clamp(2rem,4vw,3.6rem)]">
            Piezas que la gente <span className="rd-serif text-(--signal)">usa</span> todos los días
          </h2>
          <p className="rd-body mt-4 max-w-[32ch] text-[15px] text-(--paper)/65">
            Cada una salió de un proyecto en producción. Movelas: son código de verdad.
          </p>
          <div className="pointer-events-auto mt-7">
            <RdButton href="/services">Ver servicios</RdButton>
          </div>
        </div>

        {PIECES.map((piece) => (
          <Draggable
            key={piece.id}
            piece={piece}
            selected={selected === piece.id}
            onGrab={() => {
              setSelected(piece.id);
              return ++top.current;
            }}
          />
        ))}

        <Cursor name="Franco" className="cs-cursor-a top-[30%] left-[22%]" color="var(--signal)" />
        <Cursor name="Federico" className="cs-cursor-b top-[64%] left-[64%]" color="var(--paper)" />

        <div
          aria-hidden
          className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-(--paper)/10 bg-[#1a1a1d] p-1.5 shadow-[0_20px_40px_-15px_#000]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-(--signal) text-(--ink)">
            <MousePointer2 size={16} />
          </span>
          {[Frame, Square, PenTool, Type, Sparkles].map((Icon, i) => (
            <span key={i} className="grid h-9 w-9 place-items-center rounded-xl text-(--paper)/70">
              <Icon size={16} />
            </span>
          ))}
          <span className="mx-1 hidden h-6 w-px bg-(--paper)/10 sm:block" />
          <span className="rd-label hidden h-9 items-center rounded-xl bg-(--paper)/[0.06] px-3 text-[10px] text-(--paper)/60 sm:flex">
            {"</>"} Código
          </span>
        </div>
      </div>
    </CsSection>
  );
}

function Draggable({
  piece,
  selected,
  onGrab,
}: {
  piece: Piece;
  selected: boolean;
  onGrab: () => number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);

  return (
    <div
      ref={el}
      className={`cs-piece absolute z-10 left-(--mx) top-(--my) origin-top-left scale-[0.7] select-none md:left-(--x) md:top-(--y) md:block md:scale-100 ${
        piece.at.mobile === false ? "hidden" : ""
      }`}
      style={{ "--x": piece.at.x, "--y": piece.at.y, "--mx": piece.at.mx, "--my": piece.at.my } as CSSProperties}
      data-selected={selected}
      onPointerDown={(e) => {
        const node = el.current;
        if (!node) return;
        node.setPointerCapture(e.pointerId);
        node.style.zIndex = String(onGrab());
        drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.current.x, oy: pos.current.y };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const node = el.current;
        if (!d || !node || d.id !== e.pointerId) return;
        pos.current = { x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy };
        node.style.translate = `${pos.current.x}px ${pos.current.y}px`;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <p className="rd-label mb-1.5 flex items-center gap-1.5 text-[9px] text-(--paper)/45">
        <span aria-hidden>◇</span> {piece.layer}
      </p>
      <div className="cs-piece__body relative shadow-[0_24px_50px_-20px_#000]">
        {piece.body}
        {selected && (
          <>
            <span className="cs-handle -top-[8px] -left-[8px]" />
            <span className="cs-handle -top-[8px] -right-[8px]" />
            <span className="cs-handle -bottom-[8px] -left-[8px]" />
            <span className="cs-handle -right-[8px] -bottom-[8px]" />
          </>
        )}
      </div>
    </div>
  );
}

function Cursor({ name, className, color }: { name: string; className: string; color: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute z-30 ${className}`}>
      <MousePointer2 size={20} fill={color} stroke="#070708" strokeWidth={1.4} />
      <span
        className="rd-body ml-4 -mt-1 block rounded-md px-2 py-0.5 text-[12px]"
        style={{ background: color, color: "#0b0b0c" }}
      >
        {name}
      </span>
    </div>
  );
}
