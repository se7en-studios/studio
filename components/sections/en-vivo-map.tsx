"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Menu, Minus, Plus, X } from "lucide-react";
import { ZOOMS, createEngine, type ActorSpec, type Engine, type RoomLooks } from "@/lib/oficinas/engine";
import { isOwner, type ActorLook } from "@/lib/oficinas/art";
import { useLive, type LivePerson } from "@/lib/oficinas/vivo";
import type { EnVivoPublic } from "@/app/api/en-vivo/route";
import type { VisitorsNow } from "@/lib/visitas";
import { buildMap, hourIn, ledMessages, periodOf, studioRoomName, themeOf, type MapModel, type MapRoom, type OfiProject, type Who } from "@/lib/admin/oficinas-shared";
import { publicProjects, type PublicCapture } from "@/lib/en-vivo";
import { roomInfoOf } from "@/lib/en-vivo-sala";
import { archivo, pixel } from "@/lib/site-fonts";
import { getProjectBySlug } from "@/data/projects";
import { process as steps } from "@/data/services";
import { team } from "@/data/team";
import { SITE } from "@/data/site";
import { MapFrame } from "./en-vivo-frame";
import { Faces, FounderButtons, PersonCard, useHeardLine } from "./en-vivo-gestos";
import { office } from "@/lib/oficinas/medir";

// El mismo mapa de «En vivo» del panel, en modo público: sin el panel de la
// derecha, sin días ni novedades, con todas las salas prendidas. Si alguno de
// los dos está conectado al panel aparece trabajando (en su escritorio o en la
// sala del proyecto que tiene abierto); si no, el guía recorre las salas y se
// queda mirando la tele de cada una.
//
// A pantalla completa (el fichín de la landing) además se juega: arriba va la
// barra con las secciones de la web; abajo, las salas para ir de una en una
// (tu muñeco va caminando) y la ficha de la que elegiste, con sus accesos.

const NAMES: Record<Who, string> = { federico: "Federico", franco: "Franco" };
const POLL_MS = 30_000;
/** Las secciones de la landing: la barra de arriba baja hasta ellas. */
const NAV = [
  { hash: "#top", label: "Inicio" },
  { hash: "#trabajos", label: "Proyectos" },
  { hash: "#servicios", label: "Servicios" },
  { hash: "#equipo", label: "Nosotros" },
  { hash: "#contacto", label: "Contacto" },
] as const;
/** Lo que se pasa en la pantalla de Reuniones: los pasos del proceso, como en la web. */
const SLIDES = steps.map((s) => `${s.number} ${s.title}`);
const FOUNDER: Record<Who, (typeof team)[number] | undefined> = {
  federico: team.find((t) => t.name?.startsWith("Federico")),
  franco: team.find((t) => t.name?.startsWith("Franco")),
};

/**
 * Quiénes caminan: los conectados al panel o, si no hay nadie, el guía; y una
 * persona por cada visita de la página. Si Franco o Federico están mirando la
 * landing, aparecen como ellos (con su nombre arriba) y no dos veces.
 *
 * Con el canal en vivo (`live`: los que tienen la oficina abierta, `me`: vos),
 * los que entran aparecen al toque, sin esperar la lista de visitas, y el motor
 * los hace caminar como en su pestaña (setRemote). Un socio con el mapa del
 * panel abierto gana sobre el mismo socio mirando la landing (salvo que ése
 * seas vos).
 */
function actorsFor(online: EnVivoPublic["online"], map: MapModel, visitors: VisitorsNow | null, live: LivePerson[], me: LivePerson | null): ActorSpec[] {
  const list = visitors?.visitors ?? [];
  const inPanel = new Set(live.flatMap((p) => (p.id === p.look && isOwner(p.look) ? [p.look as Who] : [])));
  const youId = me?.id ?? (visitors?.you ? `v-${visitors.you}` : null);
  const guests = new Map<string, { look: ActorLook; who: Who | null }>();
  for (const v of list) guests.set(`v-${v.id}`, { look: v.who ?? `v:${v.id}`, who: v.who });
  for (const p of me ? [...live, me] : live) if (p.id.startsWith("v-") && !guests.has(p.id)) guests.set(p.id, { look: p.look, who: isOwner(p.look) ? (p.look as Who) : null });
  for (const [id, g] of guests) if (g.who && inPanel.has(g.who) && id !== youId) guests.delete(id);
  const here = new Set([...guests.values()].flatMap((g) => (g.who ? [g.who] : [])));
  const staffWho = [...new Set([...online.map((o) => o.who), ...inPanel])];
  const staff: ActorSpec[] = !staffWho.length
    ? [{ id: "guia", look: "guia", goal: { kind: "tour" } }]
    : staffWho
        .filter((w) => inPanel.has(w) || !here.has(w))
        .map((w) => {
          const o = online.find((x) => x.who === w);
          const room = o?.room ? map.rooms.find((r) => r.slug === o.room) : null;
          // Con su nombre arriba: son los dueños (el motor les pone el aura)
          return { id: w, look: w, goal: room ? { kind: "room", room: room.id } : { kind: "seat", who: w }, tag: NAMES[w] };
        });
  const guestSpecs: ActorSpec[] = [...guests].map(([id, g]) => ({ id, look: g.look, goal: { kind: "wander" }, you: id === youId, tag: g.who ? NAMES[g.who] : undefined }));
  return [...staff, ...guestSpecs];
}

/** En qué sala está cada socio conectado: la del proyecto que tiene abierto, o la de su escritorio. */
function whereIs(online: EnVivoPublic["online"], map: MapModel) {
  const out = new Map<string, Who[]>();
  for (const o of online) {
    const id = (o.room && map.rooms.find((r) => r.slug === o.room)?.id) || `off-${o.who}`;
    out.set(id, [...(out.get(id) ?? []), o.who]);
  }
  return out;
}

/** «Sólo vos mirando», «Vos y 4 personas más». */
function audience(v: VisitorsNow | null) {
  if (!v || !v.total) return null;
  return v.total === 1 ? "Sólo vos mirando" : `Vos y ${v.total - 1} ${v.total === 2 ? "persona más" : "personas más"} mirando`;
}

export function EnVivoMap({
  active,
  visitors,
  fill = false,
  hold = false,
  onReady,
  onClose,
  onNavigate,
  exitRef,
}: {
  active: boolean;
  visitors: VisitorsNow | null;
  /** Ocupa todo el contenedor (la oficina a pantalla completa del arcade) en vez de la ventanita 16:10. */
  fill?: boolean;
  /** Armado pero quieto (no dibuja): el arcade lo prepara mientras pasa el zoom y lo suelta al abrirse. */
  hold?: boolean;
  /** Avisa cuando el mapa ya se dibuja (llegaron las capturas y arrancó el motor). */
  onReady?: () => void;
  /** A pantalla completa: salir de la oficina. */
  onClose?: () => void;
  /** A pantalla completa: ir a una sección de la landing (sale de la oficina y baja hasta ahí). */
  onNavigate?: (hash: string) => void;
  /**
   * A pantalla completa: acá queda cómo despedirse antes de salir (tu muñeco
   * vuelve a entrar al fichín). Devuelve cuánto esperar en ms antes de cerrar.
   */
  exitRef?: { current: (() => number) | null };
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  // Las capturas se piden una vez (cambian una vez por día); quién está, cada 30 s.
  const [captures, setCaptures] = useState<Record<string, PublicCapture> | null>(null);
  const [online, setOnline] = useState<EnVivoPublic["online"] | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // El canal en vivo: sólo con la oficina abierta a pantalla completa
  const live = useLive(fill && active && !hold && !!engine, "visita", engine);
  const { report, leave } = live;
  const [person, setPerson] = useState<string | null>(null);
  const heardLine = useHeardLine(live.heard, live.people);

  // La medición (lib/en-vivo-medicion.ts): entrar, salir con cuánto se quedó y
  // si se cruzó con alguno de los dos en vivo
  const inside = fill && active && !hold;
  useEffect(() => {
    if (!inside) return;
    const t0 = performance.now();
    office("abrir");
    let done = false;
    const bye = () => {
      if (done) return;
      done = true;
      office("salir", null, Math.min(86_400, Math.round((performance.now() - t0) / 1000)), true);
    };
    window.addEventListener("pagehide", bye);
    return () => {
      window.removeEventListener("pagehide", bye);
      bye();
    };
  }, [inside]);
  const met = useRef(new Set<string>());
  useEffect(() => {
    if (!inside) return met.current.clear();
    for (const p of live.people)
      if (isOwner(p.look) && !met.current.has(p.look)) {
        met.current.add(p.look);
        office("socio", p.look);
      }
  }, [inside, live.people]);

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
    const info = Object.fromEntries(map.rooms.filter((r) => r.slug).map((r) => [r.id, roomInfoOf(bySlug.get(r.slug as string) as OfiProject)]));
    const e = createEngine(canvas, {
      map,
      info,
      me: "federico",
      font: pixel.style.fontFamily,
      display: archivo.style.fontFamily,
      slides: SLIDES,
      public: true,
      // A pantalla completa: zoom a escala ~1, con tope de densidad (ver fillZoom), y tu muñeco se maneja
      // y avisa por el canal en vivo dónde está; tocar a alguien de ahí abre sus gestos
      ...(fill ? { zoom: fillZoom(), maxDpr: FILL_DPR, controls: true, onState: report, onPerson: setPerson } : {}),
      onRoom: (id) => {
        if (fill) return setSelected(id);
        const slug = map.rooms.find((r) => r.id === id)?.slug;
        if (slug) router.push(`/work/${slug}`);
      },
      onHover: setHover,
    });
    const looks: RoomLooks = Object.fromEntries(map.rooms.filter((r) => r.slug).map((r) => [r.id, { fade: 0, days: null, badge: 0 }]));
    e.setLooks(looks);
    e.setTicker(ledMessages(projects));
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
  }, [captures, map, bySlug, projects, router, fill, report]);

  useEffect(() => {
    if (engine) onReady?.();
  }, [engine, onReady]);

  useEffect(() => {
    if (!exitRef) return;
    // Tu muñeco vuelve a entrar al fichín y el canal avisa ya que te vas: los demás lo ven a la vez
    exitRef.current = () => {
      const ms = engine?.leave() ?? 0;
      leave();
      return ms;
    };
    return () => {
      exitRef.current = null;
    };
  }, [engine, exitRef, leave]);

  useEffect(() => {
    if (engine && online) engine.setActors(actorsFor(online, map, visitors, live.people, live.me));
  }, [engine, online, map, visitors, live.people, live.me]);

  useEffect(() => {
    engine?.setPaused(!active || hold);
    if (active) engine?.setPeriod(periodOf(hourIn(Date.now())));
  }, [engine, active, hold]);

  const go = useCallback(
    (id: string | null) => {
      setSelected(id);
      setPerson(null);
      if (id) engine?.visit(id);
      else engine?.select(null);
    },
    [engine],
  );

  // Los socios con el mapa del panel abierto (canal en vivo) están en la oficina aunque la señal de presencia no haya llegado
  const inPanel = new Set(live.people.flatMap((p) => (p.id === p.look && isOwner(p.look) ? [p.look as Who] : [])));
  const staffNow = [...new Set([...(online ?? []).map((o) => o.who), ...inPanel])];
  const status = !online
    ? "Conectando…"
    : !staffNow.length
      ? "El guía recorre los proyectos"
      : staffNow
          .map((w) => {
            const o = online.find((x) => x.who === w);
            return `${NAMES[w]} ${o?.room ? `está en la sala de ${bySlug.get(o.room)?.name ?? o.room}` : inPanel.has(w) ? "está en la oficina" : "está en su escritorio"}`;
          })
          .join(" · ");
  const hovered = hover ? map.rooms.find((r) => r.id === hover) : null;
  const where = useMemo(() => whereIs(online ?? [], map), [online, map]);

  if (!fill) {
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
        <LiveBox status={status} audience={audience(visitors)} className="top-2 left-2" />
        {hp && (
          <div className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-16px)] rounded-lg bg-[rgba(11,11,12,0.86)] px-2.5 py-1.5 text-[#f2eee6] ring-1 ring-white/10">
            <p className="truncate text-[12px] leading-none font-bold" style={{ color: hp.accent }}>
              {hp.name}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] leading-none text-[#b9b4ab]">
              ver el caso <ArrowUpRight size={11} aria-hidden />
            </p>
          </div>
        )}
      </MapFrame>
    );
  }

  // La recepción primero; después las salas del estudio y los proyectos, en el orden del mapa
  const rooms = map.rooms.filter((r) => r.kind !== "storage" && r.kind !== "kitchen").sort((a, b) => +(b.kind === "reception") - +(a.kind === "reception"));
  const picked = selected ? map.rooms.find((r) => r.id === selected) ?? null : null;
  // Los dos socios: el que está en la oficina (canal en vivo) o, si no, su ficha para avisarle
  const founders = (["federico", "franco"] as Who[]).map((w) => live.people.find((p) => p.look === w && p.id === w) ?? live.people.find((p) => p.look === w) ?? { id: w, look: w, name: NAMES[w] });
  const away = new Set(founders.filter((p) => !live.people.includes(p)).map((p) => p.id));
  const target = person ? (live.people.find((p) => p.id === person) ?? founders.find((p) => p.id === person) ?? null) : null;
  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#0b0b0c] text-[#f2eee6] ${archivo.className}`}>
      <TopBar onClose={onClose} onNavigate={onNavigate} />
      <div className="absolute inset-x-0 top-[calc(52px+env(safe-area-inset-top))] bottom-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="La oficina de se7en: recepción, Desarrollo, Diseño, Reuniones, Chill-out y una sala por proyecto. Tocá una sala para ir; con las flechas movés tu muñeco."
          className="block h-full w-full cursor-pointer"
          style={{ touchAction: "none" }}
        />
        <LiveBox
          status={status}
          audience={audience(visitors)}
          hovered={hovered && hovered.id !== selected ? roomName(hovered, bySlug) : null}
          heard={heardLine}
          hint={live.people.length && !target ? "Tocá a alguien para mandarle un saludo" : null}
          className="top-3 left-3 md:top-4 md:left-4"
        />
        {engine && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 md:top-4 md:right-4">
            {([[1, "Acercar", Plus], [-1, "Alejar", Minus]] as const).map(([step, label, Icon]) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => engine.zoomBy(step)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(11,11,12,0.86)] text-[#f2eee6] ring-1 ring-white/10 transition-colors hover:bg-[#ff4d2e] focus-visible:outline-2 focus-visible:outline-[#ff6a4f]"
              >
                <Icon size={16} aria-hidden />
              </button>
            ))}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0b0c] via-[rgba(10,10,20,0.75)] to-transparent pt-10 pb-[max(10px,env(safe-area-inset-bottom))]">
          {target ? (
            <PersonCard
              key={target.id}
              person={target}
              onGesture={(g) => {
                const ok = live.gesture(target.id, g);
                if (ok) office("gesto", `${g}:${isOwner(target.look) ? "socio" : "visita"}`);
                return ok;
              }}
              away={away.has(target.id) ? { online: (online ?? []).some((o) => o.who === target.look), onCall: () => live.call(target.look as Who) } : null}
              mail={isOwner(target.look) ? mailTo(NAMES[target.look as Who]) : null}
              onMail={() => office("contacto", "mail")}
              onClose={() => setPerson(null)}
              className="mx-3 mb-2 md:mx-4 md:mb-3 md:w-[380px] md:p-4"
            />
          ) : picked && (
            <RoomCard
              room={picked}
              project={picked.slug ? bySlug.get(picked.slug) ?? null : null}
              here={where.get(picked.id) ?? []}
              online={online ?? []}
              bySlug={bySlug}
              onClose={() => go(null)}
              onNavigate={onNavigate}
            />
          )}
          {/* Los dos socios, siempre con un botón: en la oficina se los saluda; si no, se les avisa o se les escribe */}
          <FounderButtons people={founders.filter((p) => p.id !== target?.id)} away={away} onPick={setPerson} className="mb-2 px-3 md:px-4" />
          <RoomRail rooms={rooms} bySlug={bySlug} where={where} selected={selected} onPick={go} />
        </div>
      </div>
    </div>
  );
}

/** El mail del estudio con el asunto y el saludo armados para ese socio. */
const mailTo = (name: string) => `mailto:${SITE.email}?subject=${encodeURIComponent("Te vi en la oficina de la web")}&body=${encodeURIComponent(`¡Hola ${name}! `)}`;

/** El nombre de una sala: el del proyecto o el de la sala del estudio. */
function roomName(r: MapRoom, bySlug: Map<string, OfiProject>) {
  return r.slug ? bySlug.get(r.slug)?.name ?? r.slug : studioRoomName(r);
}

/** El cartel de arriba: en vivo, quién está y quién mira (y, en la oficina abierta, el gesto que te mandaron). */
function LiveBox({ status, audience, hovered, heard, hint, className }: { status: string; audience: string | null; hovered?: string | null; heard?: string | null; hint?: string | null; className: string }) {
  return (
    <div className={`pointer-events-none absolute max-w-[min(70%,360px)] rounded-xl bg-[rgba(11,11,12,0.86)] px-3 py-2 ring-1 ring-white/10 ${className}`} aria-live="polite">
      <p className="flex items-center gap-1.5 text-[11px] leading-none font-extrabold tracking-[0.12em] text-[#ffb199] uppercase">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d2e] opacity-70 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff6a4f]" />
        </span>
        En vivo
      </p>
      <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-[#f2eee6]">{status}</p>
      {audience && <p className="truncate text-[11px] leading-snug text-[#ff6a4f]">{audience}</p>}
      {hovered && <p className="mt-1 truncate text-[11px] leading-snug font-bold text-white">→ {hovered}</p>}
      {heard ? (
        <p className="mt-1.5 truncate rounded-md bg-[#ff4d2e] px-2 py-1 text-[12px] leading-none font-extrabold text-[#0b0b0c]">{heard}</p>
      ) : (
        hint && <p className="mt-1 truncate text-[11px] leading-snug text-[#b9b4ab]">{hint}</p>
      )}
    </div>
  );
}

/**
 * La barra de arriba: el estudio a la izquierda y las secciones de la web.
 * No tapa la oficina: el mapa empieza debajo. En el celular, las secciones van
 * en un menú.
 */
function TopBar({ onClose, onNavigate }: { onClose?: () => void; onNavigate?: (hash: string) => void }) {
  const [open, setOpen] = useState(false);
  const link = (n: (typeof NAV)[number], cls: string) => (
    <a
      key={n.hash}
      href={`/${n.hash}`}
      onClick={(e) => {
        // El scroll suave de la landing escucha los clics en anclas: acá primero hay que salir de la oficina
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        if (n.hash === "#contacto") office("contacto", "barra");
        onNavigate?.(n.hash);
      }}
      className={cls}
    >
      {n.label}
    </a>
  );
  return (
    <header className="absolute inset-x-0 top-0 z-20 h-[calc(52px+env(safe-area-inset-top))] bg-[#0b0b0c] pt-[env(safe-area-inset-top)]">
      <div className="flex h-[52px] items-center gap-2 px-3 md:gap-4 md:px-5">
        <span className="flex min-w-0 items-center gap-2">
          <Image src="/logo-simbolo.png" alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0" />
          <span className="truncate text-[14px] font-extrabold tracking-tight">
            Se7en <span className="text-[#ff6a4f]">Office</span>
          </span>
        </span>
        <nav aria-label="Secciones de la web" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => link(n, "rounded-lg px-3 py-2 text-[13px] font-semibold text-[#e6e0d4] transition-colors hover:bg-[#ff4d2e]/20 hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff6a4f]"))}
        </nav>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="oficina-menu"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-[#e6e0d4] ring-1 ring-white/10 md:hidden"
        >
          <Menu size={16} aria-hidden /> Menú
        </button>
        {onClose && (
          <button
            type="button"
            data-office-close
            onClick={onClose}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#ff4d2e] px-3 text-[13px] font-bold text-[#0b0b0c] transition-colors hover:bg-[#ff6a4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb199]"
          >
            <X size={15} aria-hidden /> Salir
          </button>
        )}
      </div>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#ff4d2e] to-transparent" />
      {open && (
        <nav id="oficina-menu" aria-label="Secciones de la web" className="absolute top-full right-3 mt-2 w-56 rounded-xl bg-[#151517] p-1.5 shadow-2xl ring-1 ring-[#ff4d2e]/40 md:hidden">
          {NAV.map((n) => link(n, "block rounded-lg px-3 py-2.5 text-[14px] font-semibold text-[#f2eee6] hover:bg-[#ff4d2e]/20"))}
          <span aria-hidden className="mx-3 my-1.5 block h-px bg-white/10" />
          <a href={SITE.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => office("whatsapp", "menu")} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] font-semibold text-[#ffb199] hover:bg-[#ff4d2e]/20">
            WhatsApp <ArrowUpRight size={14} aria-hidden />
          </a>
          <a href={`mailto:${SITE.email}`} className="block truncate rounded-lg px-3 py-2.5 text-[13px] text-[#b9b4ab] hover:bg-[#ff4d2e]/20">
            {SITE.email}
          </a>
        </nav>
      )}
    </header>
  );
}

/** Las salas, de una en una: tocar una lleva a tu muñeco (o la cámara) hasta ahí. */
function RoomRail({ rooms, bySlug, where, selected, onPick }: { rooms: MapRoom[]; bySlug: Map<string, OfiProject>; where: Map<string, Who[]>; selected: string | null; onPick: (id: string) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const idx = rooms.findIndex((r) => r.id === selected);
  useEffect(() => {
    if (!selected) return;
    rail.current?.querySelector<HTMLElement>(`[data-room="${selected}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selected]);
  const step = (k: number) => onPick(rooms[(Math.max(idx, k > 0 ? -1 : 0) + k + rooms.length) % rooms.length].id);
  return (
    <div className="flex items-center gap-1.5 px-3 md:gap-2 md:px-4">
      <button type="button" aria-label="Sala anterior" onClick={() => step(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(11,11,12,0.9)] ring-1 ring-white/10 hover:bg-[#ff4d2e]">
        <ChevronLeft size={18} aria-hidden />
      </button>
      <div ref={rail} role="list" aria-label="Salas de la oficina" className="flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] md:gap-2 [&::-webkit-scrollbar]:hidden">
        {rooms.map((r) => {
          const p = r.slug ? bySlug.get(r.slug) : null;
          const on = r.id === selected;
          const here = where.get(r.id) ?? [];
          return (
            <span role="listitem" key={r.id} className="shrink-0 snap-center">
              <button
                type="button"
                data-room={r.id}
                aria-pressed={on}
                onClick={() => onPick(r.id)}
                className={`flex h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-[#ffb199] ${
                  on ? "bg-[#ff4d2e] text-[#0b0b0c] ring-[#ffb199]" : "bg-[rgba(11,11,12,0.9)] text-[#f2eee6] ring-white/10 hover:bg-[#26262a]"
                }`}
              >
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/40" style={{ background: p?.accent ?? "#ff6a4f" }} />
                {p?.name ?? studioRoomName(r)}
                {here.length > 0 && (
                  <>
                    <Faces who={here} />
                    <span className="sr-only">{`(${here.map((w) => NAMES[w]).join(" y ")} acá ahora)`}</span>
                  </>
                )}
              </button>
            </span>
          );
        })}
      </div>
      <button type="button" aria-label="Sala siguiente" onClick={() => step(1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(11,11,12,0.9)] ring-1 ring-white/10 hover:bg-[#ff4d2e]">
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}

type Action = { label: string; href: string; external?: boolean; hash?: boolean; primary?: boolean };

/** La ficha de la sala elegida: qué es, quién está y a dónde ir desde ahí. Todo sale de la web (data/). */
function RoomCard({
  room,
  project,
  here,
  online,
  bySlug,
  onClose,
  onNavigate,
}: {
  room: MapRoom;
  project: OfiProject | null;
  here: Who[];
  online: EnVivoPublic["online"];
  bySlug: Map<string, OfiProject>;
  onClose: () => void;
  onNavigate?: (hash: string) => void;
}) {
  let kicker = "", title = "", accent = "#ff6a4f";
  let body: ReactNode = null;
  let actions: Action[] = [];
  let mark: string | null = null;
  if (project) {
    const p = getProjectBySlug(project.slug);
    kicker = project.category;
    title = project.name;
    accent = project.accent;
    mark = project.brand?.mark ?? null;
    body = p?.shortDescription;
    actions = [{ label: "Ver el caso", href: `/work/${project.slug}`, primary: true }, ...(project.url ? [{ label: "Visitar el sitio", href: project.url, external: true }] : [])];
  } else if (room.kind === "office" && room.who) {
    const who = room.who, t = FOUNDER[who];
    const o = online.find((x) => x.who === who);
    kicker = studioRoomName(room);
    title = `El escritorio de ${NAMES[who]}`;
    body = (
      <>
        <span className="block text-[#ffb199]">{t?.role}</span>
        {t?.focus?.join(" · ")}
        <span className="mt-1.5 flex items-center gap-1.5 text-[12px]">
          <span className={`h-2 w-2 rounded-full ${o ? "bg-[#5ad1a8]" : "bg-[#5d5952]"}`} aria-hidden />
          {!o ? `${NAMES[who]} no está conectado ahora` : o.room ? `${NAMES[who]} está en la sala de ${bySlug.get(o.room)?.name ?? o.room}` : `${NAMES[who]} está en su escritorio`}
        </span>
      </>
    );
    actions = [
      { label: "Servicios", href: "#servicios", hash: true, primary: true },
      { label: "Nosotros", href: "#equipo", hash: true },
    ];
  } else if (room.kind === "reception") {
    kicker = "Recepción";
    title = "Dos fundadores. Cero intermediarios.";
    body = "Hablás directo con quien diseña y con quien programa tu proyecto. Sin ejecutivos de cuenta, sin teléfono descompuesto.";
    actions = [
      { label: "Contacto", href: "#contacto", hash: true, primary: true },
      { label: "WhatsApp", href: SITE.whatsapp, external: true },
    ];
  } else if (room.kind === "meeting") {
    kicker = "Reuniones";
    title = "Cómo trabajamos";
    body = (
      <ol className="mt-0.5 space-y-0.5">
        {steps.map((s) => (
          <li key={s.number} className="flex gap-2">
            <span className="font-bold text-[#ff6a4f] tabular-nums">{s.number}</span>
            <span>
              {s.title} <span className="text-[#8d8982]">· {s.duration}</span>
            </span>
          </li>
        ))}
      </ol>
    );
    actions = [{ label: "Contacto", href: "#contacto", hash: true, primary: true }];
  } else if (room.kind === "lounge") {
    kicker = "Chill-out";
    title = "El rincón del café";
    body = "Los puffs, la cafetera y el fichín de la casa, abiertos al pasillo.";
    actions = [
      { label: "Nosotros", href: "#equipo", hash: true, primary: true },
      { label: "Servicios", href: "#servicios", hash: true },
    ];
  }
  const btn = (primary?: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb199] ${
      primary ? "bg-[#ff4d2e] text-[#0b0b0c] hover:bg-[#ff6a4f]" : "bg-white/8 text-[#f2eee6] ring-1 ring-white/15 hover:bg-white/15"
    }`;
  return (
    <section
      aria-label={title}
      className="mx-3 mb-2 rounded-2xl bg-[rgba(21,21,23,0.96)] p-3.5 shadow-2xl ring-1 ring-white/10 md:mx-4 md:mb-3 md:w-[380px] md:p-4"
      style={{ boxShadow: `inset 0 3px 0 ${accent}, 0 20px 50px rgba(0,0,0,0.5)` }}
    >
      <div className="flex items-start gap-3">
        {mark && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b0b0c] ring-1 ring-white/10">
            <Image src={mark} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: accent }}>
            {kicker}
          </p>
          <h2 className="mt-0.5 text-[17px] leading-tight font-extrabold text-white">{title}</h2>
        </div>
        <button type="button" aria-label="Cerrar la ficha" onClick={onClose} className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#b9b4ab] hover:bg-white/10 hover:text-white">
          <X size={16} aria-hidden />
        </button>
      </div>
      {body && <div className="mt-2 text-[13px] leading-snug text-[#d9d4cb]">{body}</div>}
      {here.length > 0 && (
        <p className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-[#5ad1a8]">
          <Faces who={here} size={20} />
          {here.map((w) => NAMES[w]).join(" y ")} {here.length > 1 ? "están" : "está"} acá ahora
        </p>
      )}
      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) =>
            a.external ? (
              <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" onClick={() => a.href === SITE.whatsapp && office("whatsapp", "sala")} className={btn(a.primary)}>
                {a.label} <ArrowUpRight size={14} aria-hidden />
              </a>
            ) : a.hash ? (
              <a
                key={a.label}
                href={`/${a.href}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (a.href === "#contacto") office("contacto", "sala");
                  onNavigate?.(a.href);
                }}
                className={btn(a.primary)}
              >
                {a.label}
              </a>
            ) : (
              <Link key={a.label} href={a.href} className={btn(a.primary)}>
                {a.label} <ArrowUpRight size={14} aria-hidden />
              </Link>
            ),
          )}
        </div>
      )}
    </section>
  );
}

/** Tope de densidad del lienzo a pantalla completa (en retina, 2x cuadruplicaba los píxeles). */
const FILL_DPR = 1.5;

/**
 * El zoom de arranque a pantalla completa: el que deja el dibujo a escala ~1
 * (zoom × densidad). Ahí el arte horneado se copia tal cual; con otras escalas
 * la placa lo tiene que remuestrear y el cuadro tarda hasta el doble.
 */
function fillZoom() {
  const d = Math.min(FILL_DPR, window.devicePixelRatio || 1);
  // En un celular parado, un poco más cerca (escala ~1.2): si no, los muñecos quedan chiquitos
  const k = window.innerWidth < 640 ? 1.2 : 1;
  return ZOOMS.reduce((a, b) => (Math.abs(b * d - k) < Math.abs(a * d - k) ? b : a));
}
