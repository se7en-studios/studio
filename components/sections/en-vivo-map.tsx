"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { createEngine, type ActorSpec, type Engine, type RoomLooks } from "@/lib/oficinas/engine";
import type { EnVivoPublic } from "@/app/api/en-vivo/route";
import { buildMap, hourIn, periodOf, themeOf, type MapModel, type Who } from "@/lib/admin/oficinas-shared";
import { publicProjects, type PublicCapture } from "@/lib/en-vivo";
import { roomInfoOf } from "@/lib/en-vivo-sala";
import { pixel } from "@/lib/site-fonts";
import { MapFrame } from "./en-vivo-frame";

// El mismo mapa de «En vivo» del panel, en modo público: sin el panel de la
// derecha, sin días ni novedades, con todas las salas prendidas. Si alguno de
// los dos está conectado al panel aparece trabajando (en su escritorio o en la
// sala del proyecto que tiene abierto); si no, el guía recorre las salas y se
// queda mirando la tele de cada una.

const NAMES: Record<Who, string> = { federico: "Federico", franco: "Franco" };
const POLL_MS = 30_000;

/** Quiénes caminan: los conectados o, si no hay nadie, el guía. */
function actorsFor(online: EnVivoPublic["online"], map: MapModel): ActorSpec[] {
  if (!online.length) return [{ id: "guia", look: "guia", goal: { kind: "tour" } }];
  return online.map((o) => {
    const room = o.room ? map.rooms.find((r) => r.slug === o.room) : null;
    return { id: o.who, look: o.who, goal: room ? { kind: "room", room: room.id } : { kind: "seat", who: o.who } };
  });
}

export function EnVivoMap({ active }: { active: boolean }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  // Las capturas se piden una vez (cambian una vez por día); quién está, cada 30 s.
  const [captures, setCaptures] = useState<Record<string, PublicCapture> | null>(null);
  const [online, setOnline] = useState<EnVivoPublic["online"] | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const projects = useMemo(() => publicProjects(captures ?? {}), [captures]);
  const map = useMemo(() => buildMap(projects.map((p) => ({ slug: p.slug, status: p.status, theme: themeOf(p) }))), [projects]);
  const bySlug = useMemo(() => new Map(projects.map((p) => [p.slug, p])), [projects]);

  useEffect(() => {
    if (!active) return;
    let gone = false;
    const load = () =>
      fetch("/api/en-vivo")
        .then((r) => (r.ok ? (r.json() as Promise<EnVivoPublic>) : Promise.reject(new Error(String(r.status)))))
        .then((d) => {
          if (gone) return;
          setOnline(d.online);
          setCaptures((c) => c ?? d.captures);
        })
        .catch(() => {
          // Sin datos, el mapa anda igual: el guía y las capturas fijas de la web.
          if (gone) return;
          setOnline((o) => o ?? []);
          setCaptures((c) => c ?? {});
        });
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      gone = true;
      window.clearInterval(id);
    };
  }, [active]);

  // El motor se arma cuando llegan las capturas (así la tele no cambia de golpe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !captures) return;
    const info = Object.fromEntries(map.rooms.filter((r) => r.slug).map((r) => [r.id, roomInfoOf(bySlug.get(r.slug as string) as (typeof projects)[number])]));
    const e = createEngine(canvas, {
      map,
      info,
      me: "federico",
      font: pixel.style.fontFamily,
      public: true,
      onRoom: (id) => {
        const slug = map.rooms.find((r) => r.id === id)?.slug;
        if (slug) router.push(`/work/${slug}`);
      },
      onHover: setHover,
    });
    const looks: RoomLooks = Object.fromEntries(map.rooms.filter((r) => r.slug).map((r) => [r.id, { fade: 0, days: null, badge: 0 }]));
    e.setLooks(looks);
    e.setTicker(`SE7EN STUDIO   +   DISEÑO Y DESARROLLO DE PRODUCTOS DIGITALES   +   ${projects.map((p) => p.name.toUpperCase()).join("   +   ")}   +   ASÍ LABURAMOS, EN VIVO`);
    e.setPeriod(periodOf(hourIn(Date.now())));
    const ro = new ResizeObserver(() => e.resize());
    ro.observe(canvas);
    document.fonts?.load(`8px ${pixel.style.fontFamily}`).catch(() => {});
    setEngine(e);
    return () => {
      ro.disconnect();
      e.destroy();
      setEngine(null);
    };
  }, [captures, map, bySlug, projects, router]);

  useEffect(() => {
    if (engine && online) engine.setActors(actorsFor(online, map));
  }, [engine, online, map]);

  useEffect(() => {
    engine?.setPaused(!active);
    if (active) engine?.setPeriod(periodOf(hourIn(Date.now())));
  }, [engine, active]);

  const status = !online
    ? "Conectando…"
    : !online.length
      ? "El guía recorre los proyectos"
      : online.map((o) => `${NAMES[o.who]} ${o.room ? `está en la sala de ${bySlug.get(o.room)?.name ?? o.room}` : "está en su escritorio"}`).join(" · ");
  const hovered = hover ? map.rooms.find((r) => r.id === hover) : null;
  const hp = hovered?.slug ? bySlug.get(hovered.slug) : null;

  return (
    <MapFrame>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="El estudio de se7en como un mapa: cada sala es un proyecto en producción, con su sitio en la tele."
        className="block h-full w-full cursor-pointer"
        style={{ touchAction: "pan-y" }}
      />
      <div className="pointer-events-none absolute top-2 left-2 max-w-[calc(100%-16px)] rounded-md border border-white/10 bg-[rgba(10,10,14,0.78)] px-2 py-1.5 text-[#f1ede6]" aria-live="polite">
        <p className={`flex items-center gap-1.5 text-[11px] leading-none uppercase ${pixel.className}`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d2e] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff4d2e]" />
          </span>
          En vivo
        </p>
        <p className="mt-1 truncate font-mono text-[10px] leading-snug text-[#a39e95]">{status}</p>
      </div>
      {hp && (
        <div className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-16px)] rounded-md border border-white/10 bg-[rgba(10,10,14,0.82)] px-2 py-1.5 text-[#f1ede6]">
          <p className={`truncate text-[11px] leading-none uppercase ${pixel.className}`} style={{ color: hp.accent }}>
            {hp.name}
          </p>
          <p className="mt-1 flex items-center gap-1 font-mono text-[10px] leading-none text-[#a39e95]">
            ver el caso <ArrowUpRight size={11} aria-hidden />
          </p>
        </div>
      )}
    </MapFrame>
  );
}
