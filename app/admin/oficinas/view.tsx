"use client";

// «En vivo»: el mapa (canvas, engine.ts) y el panel de la sala en la que estás.
// Entrar a una sala la marca como visitada en /admin/api/oficinas/visita y la
// prende sin recargar.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, Minus, Plus } from "lucide-react";
import {
  buildMap,
  daysLabel,
  daysSince,
  dayKey,
  hourIn,
  lookOf,
  newSince,
  otherOf,
  periodOf,
  plantStage,
  relTime,
  salaMasApagada,
  themeOf,
  zoneOf,
  type MapRoom,
  type OficinasData,
  type OfiEvent,
  type OfiProject,
  type OfiTask,
  type Who,
} from "@/lib/admin/oficinas-shared";
import { PEOPLE } from "@/lib/admin/people";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/admin/project-shared";
import { dueLabel } from "@/lib/admin/task-shared";
import { Face, Progress, StatusPill, btnPrimary, btnSecondary, cn } from "../kit";
import { useToast } from "../overlay";
import { createEngine, type Engine, type RoomLooks } from "./engine";

type Visits = Record<Who, Record<string, string | null>>;
type Dir = "up" | "down" | "left" | "right";

export function OficinasView({ data, font, fontClass }: { data: OficinasData; font: string; fontClass: string }) {
  const me = data.me, other = otherOf(me);
  const flash = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const map = useMemo(() => buildMap(data.projects.map((p) => ({ slug: p.slug, status: p.status, theme: themeOf(p) }))), [data.projects]);
  const bySlug = useMemo(() => new Map(data.projects.map((p) => [p.slug, p])), [data.projects]);
  const [visits, setVisits] = useState<Visits>(() => ({
    federico: Object.fromEntries(data.projects.map((p) => [p.slug, p.lastVisit.federico])),
    franco: Object.fromEntries(data.projects.map((p) => [p.slug, p.lastVisit.franco])),
  }));
  // Hora de referencia: la del servidor al armar la página; después avanza sola.
  const [now, setNow] = useState(() => Date.parse(data.generatedAt));
  const [roomId, setRoomId] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const visitsRef = useRef(visits);
  const lightUp = useRef<string | null>(null);
  const warned = useRef(false);
  const room = roomId ? map.rooms.find((r) => r.id === roomId) ?? null : null;

  const enter = useCallback(
    (id: string | null) => {
      setRoomId(id);
      const r = id ? map.rooms.find((x) => x.id === id) : null;
      if (!r?.slug) return;
      const slug = r.slug;
      setPrev(visitsRef.current[me][slug] ?? null);
      lightUp.current = r.id;
      const at = new Date().toISOString();
      setVisits((v) => ({ ...v, [me]: { ...v[me], [slug]: at } }));
      setNow(Date.now());
      fetch("/admin/api/oficinas/visita", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) })
        .then(async (res) => {
          if (res.ok || warned.current) return;
          warned.current = true;
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          flash(`La visita no quedó guardada. ${j?.error ?? "Probá de nuevo en un rato."}`, "error");
        })
        .catch(() => {});
    },
    [map, me, flash],
  );
  const enterRef = useRef(enter);
  useEffect(() => {
    enterRef.current = enter;
    visitsRef.current = visits;
  });

  // El motor se crea una vez por mapa
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const info = Object.fromEntries(
      map.rooms.filter((r) => r.slug).map((r) => {
        const p = bySlug.get(r.slug as string) as OfiProject;
        return [r.id, { name: p.name, accent: p.accent, status: p.status }];
      }),
    );
    const engine = createEngine(canvas, {
      map,
      info,
      me,
      font,
      names: { federico: PEOPLE.federico.name, franco: PEOPLE.franco.name },
      onRoom: (id) => enterRef.current(id),
    });
    engineRef.current = engine;
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);
    document.fonts?.load(`8px ${font}`).catch(() => {});
    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [map, bySlug, me, font]);

  // Lo que cambia (visitas, hora) se le pasa al motor
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    const looks: RoomLooks = {};
    for (const r of map.rooms) if (r.slug) looks[r.id] = lookOf(bySlug.get(r.slug) as OfiProject, visits[me][r.slug] ?? null, me, now);
    e.setLooks(looks, lightUp.current ?? undefined);
    lightUp.current = null;
    e.setTicker(
      data.studioEvents
        .map((ev) => `${ev.actor ? PEOPLE[ev.actor].name : "Panel"} ${ev.text}${ev.projectSlug && bySlug.get(ev.projectSlug) ? ` · ${bySlug.get(ev.projectSlug)?.name}` : ""} · ${relTime(ev.createdAt, now)}`)
        .join("   +   ")
        .toUpperCase()
        .replace(/→/g, ">")
        .replace(/[«»]/g, '"'),
    );
    e.setPartnerLine(partnerLine(visits[other], bySlug, now));
    e.setPeriod(periodOf(hourIn(now)));
  }, [map, bySlug, visits, me, other, now, data.studioEvents]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const press = (d: Dir, on: boolean) => engineRef.current?.press(d, on);
  const goTo = (id: string) => engineRef.current?.goTo(id);
  const look = room?.slug ? lookOf(bySlug.get(room.slug) as OfiProject, visits[me][room.slug] ?? null, me, now) : null;
  const hud = !room
    ? "Pasillo"
    : room.slug
      ? bySlug.get(room.slug)?.name ?? ""
      : room.kind === "office"
        ? room.who === me
          ? "Tu oficina"
          : `Oficina de ${PEOPLE[room.who as Who].name}`
        : room.kind === "reception"
          ? "Recepción"
          : room.kind === "kitchen"
            ? "Cocina"
            : "Depósito";

  return (
    <div className="grid overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-card)] lg:h-[calc(100dvh-190px)] lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* El escenario es siempre de noche: el edificio flota sobre negro en los dos temas. */}
      <div className="relative h-[60dvh] min-h-[380px] bg-[#07070a] lg:h-full">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label="Mapa del estudio: recepción, las oficinas de Franco y Federico y una sala por proyecto. Las salas se apagan con los días sin entrar."
          className="block h-full w-full cursor-pointer touch-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        />
        <div className="pointer-events-none absolute top-3 left-3 max-w-[calc(100%-24px)] rounded-lg border border-[rgba(255,255,255,0.09)] bg-[rgba(10,10,14,0.78)] px-2.5 py-2 text-[#f1ede6]">
          <p className={cn("truncate text-[16px] leading-none uppercase", fontClass)}>{hud}</p>
          {look && <p className="mt-1.5 font-mono text-[11px] leading-none text-[#a39e95]">luz {Math.round((1 - look.fade) * 100)}%</p>}
        </div>
        <div className="absolute bottom-3 left-3 flex gap-1">
          {([[-1, Minus, "Alejar"], [1, Plus, "Acercar"]] as const).map(([step, Icon, label]) => (
            <button
              key={label}
              onClick={() => engineRef.current?.zoomBy(step)}
              aria-label={label}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.09)] bg-[rgba(10,10,14,0.78)] text-[#f1ede6] hover:bg-[rgba(40,40,48,0.9)]"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        <p className="pointer-events-none absolute bottom-[18px] left-[88px] hidden text-[12px] text-[#a39e95] [@media(hover:hover)_and_(pointer:fine)]:block">
          Clic en una sala para entrar · flechas o WASD para caminar
        </p>
        <div className="absolute right-3 bottom-3 hidden grid-cols-2 gap-1.5 [@media(pointer:coarse)]:grid" aria-label="Caminar">
          {([["left", ArrowUpLeft, "Arriba a la izquierda"], ["up", ArrowUpRight, "Arriba a la derecha"], ["down", ArrowDownLeft, "Abajo a la izquierda"], ["right", ArrowDownRight, "Abajo a la derecha"]] as const).map(([d, Icon, label]) => (
            <button
              key={d}
              aria-label={label}
              onPointerDown={(e) => {
                e.preventDefault();
                press(d, true);
              }}
              onPointerUp={() => press(d, false)}
              onPointerCancel={() => press(d, false)}
              onPointerLeave={() => press(d, false)}
              className="flex h-12 w-12 touch-none items-center justify-center rounded-lg border border-[rgba(255,255,255,0.09)] bg-[rgba(10,10,14,0.78)] text-[#f1ede6] active:bg-accent"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      <aside aria-label="Detalle de la sala" className="admin-scroll min-h-0 space-y-5 border-t border-[var(--line)] p-5 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        {!room && <Hall data={data} bySlug={bySlug} map={map} visits={visits} me={me} now={now} onGo={goTo} />}
        {room?.slug && (
          <ProjectRoom
            p={bySlug.get(room.slug) as OfiProject}
            room={room}
            me={me}
            prev={prev}
            otherVisit={visits[other][room.slug] ?? null}
            now={now}
            onOut={() => engineRef.current?.goOut()}
          />
        )}
        {room?.kind === "office" && <Office who={room.who as Who} me={me} data={data} bySlug={bySlug} visits={visits} now={now} />}
        {room?.kind === "reception" && <Reception events={data.studioEvents} bySlug={bySlug} now={now} />}
        {room && !room.slug && (room.kind === "kitchen" || room.kind === "storage") && (
          <div>
            <Eyebrow>Sala sin proyecto</Eyebrow>
            <Title>{room.kind === "kitchen" ? "Cocina" : "Depósito"}</Title>
            <p className="mt-1 text-[13px] text-muted">Completa la fila cuando la cantidad de salas es impar.</p>
            <button className={cn(btnSecondary, "mt-4")} onClick={() => engineRef.current?.goOut()}>
              Volver al pasillo
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function partnerLine(v: Record<string, string | null>, bySlug: Map<string, OfiProject>, now: number) {
  let best: string | null = null;
  for (const [slug, at] of Object.entries(v)) if (at && bySlug.has(slug) && (!best || at > (v[best] as string))) best = slug;
  if (!best) return "TODAVÍA NO ENTRÉ A NINGUNA SALA";
  return `ESTUVE EN ${bySlug.get(best)?.name.toUpperCase()} ${daysLabel(daysSince(v[best], now)).toUpperCase()}`;
}

// --- Piezas del panel lateral ---------------------------------------------------

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">{children}</p>
);
const Title = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-1.5 text-[24px] leading-[1.1] font-semibold tracking-[-0.02em] text-foreground">{children}</h2>
);
const Section = ({ title, n, children }: { title: string; n?: number; children: React.ReactNode }) => (
  <section>
    <h3 className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-foreground">
      {title}
      {n !== undefined && <span className="font-mono text-[11px] font-normal text-muted">{n}</span>}
    </h3>
    <ul className="divide-y divide-[var(--line)]">{children}</ul>
  </section>
);
const Empty = ({ children }: { children: React.ReactNode }) => <li className="py-2 text-[13px] text-muted">{children}</li>;

function Meter({ fade, accent }: { fade: number; accent: string }) {
  const on = Math.round((1 - fade) * 8);
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="h-3 w-[3px] rounded-[1px] bg-[var(--line-strong)]" style={i < on ? { background: accent } : undefined} />
      ))}
    </span>
  );
}

function TaskRow({ t, label, today }: { t: OfiTask; label: string; today: string }) {
  const late = !!t.due && t.due < today;
  const tone = t.priority === "alta" ? "bg-accent" : t.priority === "media" ? "bg-amber-400" : "bg-[var(--line-strong)]";
  return (
    <li className="flex gap-2.5 py-2">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-[2px]", tone)} title={`Prioridad ${t.priority}`} />
      <div className="min-w-0">
        <p className="text-[13px] text-foreground">{t.title}</p>
        <p className="text-[12px] text-muted">
          {label} · <span className={late ? "text-red-400" : undefined}>{t.due ? (late ? `venció ${dueLabel(t.due, today)}` : `vence ${dueLabel(t.due, today)}`) : "sin fecha"}</span>
        </p>
      </div>
    </li>
  );
}

function EventRow({ e, extra, isNew, now }: { e: OfiEvent; extra?: string; isNew?: boolean; now: number }) {
  return (
    <li className="flex gap-2.5 py-2">
      <Face who={e.actor} size={22} alt="" />
      <div className="min-w-0">
        <p className="text-[13px] text-foreground">
          {e.text}
          {isNew && <span className="ml-1.5 font-mono text-[10px] tracking-[0.08em] text-accent uppercase">nuevo</span>}
        </p>
        <p className="text-[12px] text-muted">
          {e.actor ? PEOPLE[e.actor].name : "Panel"}
          {extra ? ` · ${extra}` : ""} · {relTime(e.createdAt, now)}
        </p>
      </div>
    </li>
  );
}

function Hall({ data, bySlug, map, visits, me, now, onGo }: { data: OficinasData; bySlug: Map<string, OfiProject>; map: ReturnType<typeof buildMap>; visits: Visits; me: Who; now: number; onGo: (id: string) => void }) {
  const worst = salaMasApagada(data.projects, (s) => visits[me][s] ?? null, now);
  const rows = map.rooms
    .filter((r) => r.slug)
    .map((r) => ({ r, p: bySlug.get(r.slug as string) as OfiProject, l: lookOf(bySlug.get(r.slug as string) as OfiProject, visits[me][r.slug as string] ?? null, me, now) }))
    .sort((a, b) => b.l.fade - a.l.fade || a.p.name.localeCompare(b.p.name, "es"));
  const plant = worst ? ["la planta está bien", "la planta pide agua", "la planta se está secando", "la planta ya se secó"][plantStage(worst.fade)] : "";
  const archive = data.projects.some((p) => zoneOf(p.status) === "archive");
  return (
    <>
      <div>
        <Eyebrow>Pasillo</Eyebrow>
        <Title>El estudio</Title>
        <p className="mt-1 text-[13px] text-muted">Tocá una sala del mapa o elegila acá para ir caminando.</p>
      </div>
      {!data.visitsReady && (
        <p className="rounded-lg border border-[var(--line-strong)] bg-[var(--well)] p-3 text-[12px] text-muted">
          Falta correr <code className="text-foreground">supabase/oficinas.sql</code> en Supabase: el mapa anda, pero las visitas no se guardan.
        </p>
      )}
      {worst && worst.fade === 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4 shadow-[var(--shadow-card)]">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Todas prendidas</p>
          <p className="mt-1 text-[18px] font-semibold text-foreground">Las {rows.length} salas tienen la luz prendida</p>
          <p className="mt-0.5 text-[13px] text-muted">A los tres días sin pasar por una, empieza a apagarse.</p>
        </div>
      )}
      {worst && worst.fade > 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4 shadow-[var(--shadow-card)]">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Sala más apagada</p>
          <p className="mt-1 text-[18px] font-semibold text-foreground">{worst.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {worst.days === null ? "Nunca entraste" : `No entrás ${daysLabel(worst.days)}`}; {plant}.
          </p>
          <button className={cn(btnPrimary, "mt-3")} onClick={() => onGo(`p-${worst.slug}`)}>
            Ir a la sala
          </button>
        </div>
      )}
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-foreground">
          Salas <span className="font-mono text-[11px] font-normal text-muted">{rows.length}</span>
        </h3>
        <ul className="space-y-px">
          {rows.map(({ r, p, l }) => (
            <li key={r.id}>
              <button onClick={() => onGo(r.id)} className="focus-ring grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--well)]">
                <Meter fade={l.fade} accent={p.accent} />
                <span className="truncate text-[13px] text-foreground">{p.name}</span>
                <span className="font-mono text-[11px] text-muted">{daysLabel(l.days)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <details className="text-[13px] text-muted">
        <summary className="cursor-pointer">Cómo se apagan las salas</summary>
        <p className="mt-2 leading-relaxed">
          Empiezan a apagarse al tercer día sin entrar y quedan a oscuras al mes. Entrar a una sala la vuelve a prender; abrir el proyecto o su chat no cuenta.
          {archive ? " Los entregados van al Archivo, que se apaga más lento: desde las dos semanas y del todo a los tres meses." : ""}
        </p>
      </details>
    </>
  );
}

function ProjectRoom({ p, room, me, prev, otherVisit, now, onOut }: { p: OfiProject; room: MapRoom; me: Who; prev: string | null; otherVisit: string | null; now: number; onOut: () => void }) {
  const other = otherOf(me);
  const fresh = newSince(p.events, me, prev, now);
  const status = (PROJECT_STATUSES as readonly string[]).includes(p.status) ? (p.status as ProjectStatus) : null;
  return (
    <>
      <div>
        <Eyebrow>Sala · {room.zone === "archive" ? "Archivo" : "En curso"}</Eyebrow>
        <Title>{p.name}</Title>
        <p className="mt-1 text-[13px] text-muted">
          {p.category}
          {p.client ? ` · ${p.client}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className={cn("rounded-md px-2 py-1 font-mono text-[10.5px] tracking-[0.08em] uppercase", fresh ? "bg-accent-soft text-accent" : "bg-[var(--well)] text-muted")}>
          {fresh ? `${fresh} ${fresh === 1 ? "novedad" : "novedades"} desde tu última visita` : "Al día"}
        </span>
        <span className="rounded-md bg-[var(--well)] px-2 py-1 font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
          Última visita: {prev ? relTime(prev, now) : "nunca"}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 text-[13px]">
        <dt className="text-muted">Estado</dt>
        <dd>{status ? <StatusPill status={status} /> : p.status}</dd>
        <dt className="text-muted">Responsable</dt>
        <dd className="flex items-center gap-2 text-foreground">
          <Face who={p.owner} size={22} alt="" />
          {p.owner ? PEOPLE[p.owner].name : "Sin asignar"}
        </dd>
        {p.due && (
          <>
            <dt className="text-muted">Entrega</dt>
            <dd className="text-foreground">{dueLabel(p.due, dayKey(now))}</dd>
          </>
        )}
        <dt className="text-muted">{PEOPLE[other].name}</dt>
        <dd className="flex items-center gap-2 text-foreground">
          <Face who={other} size={22} alt="" />
          entró {daysLabel(daysSince(otherVisit, now))}
        </dd>
      </dl>
      <div>
        <div className="mb-1.5 flex justify-between text-[12px] text-muted">
          <span>Avance</span>
          <span className="text-foreground tabular-nums">{p.progress}%</span>
        </div>
        <Progress value={p.progress} accent={p.accent} />
      </div>
      <Section title="Lo que falta" n={p.openTasks.length}>
        {p.openTasks.length ? p.openTasks.map((t) => <TaskRow key={t.id} t={t} today={dayKey(now)} label={t.assignee ? PEOPLE[t.assignee].name : "Sin asignar"} />) : <Empty>Sin pendientes abiertos.</Empty>}
      </Section>
      <Section title="Actualizaciones">
        {p.events.length ? p.events.map((e) => <EventRow key={e.id} e={e} now={now} isNew={e.actor !== me && (!prev || e.createdAt > prev)} />) : <Empty>Todavía no hay movimientos.</Empty>}
      </Section>
      {p.notes && (
        <section>
          <h3 className="mb-1.5 text-[13px] font-semibold text-foreground">Notas</h3>
          <p className="rounded-lg border border-[var(--line)] bg-[var(--well)] px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">{p.notes}</p>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/proyectos/${p.slug}`} className={btnPrimary}>
          Abrir en el panel
        </Link>
        <button className={btnSecondary} onClick={onOut}>
          Volver al pasillo
        </button>
      </div>
    </>
  );
}

function Office({ who, me, data, bySlug, visits, now }: { who: Who; me: Who; data: OficinasData; bySlug: Map<string, OfiProject>; visits: Visits; now: number }) {
  const mine = who === me, name = PEOPLE[who].name;
  const tasks = data.openTasks.filter((t) => t.assignee === who).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const seen = Object.entries(visits[who])
    .filter((e): e is [string, string] => !!e[1] && bySlug.has(e[0]))
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, 4);
  return (
    <>
      <div>
        <Eyebrow>{mine ? "Tu oficina" : "Oficina"}</Eyebrow>
        <Title>
          <span className="flex items-center gap-2.5">
            <Face who={who} size={26} alt="" />
            {mine ? "Tus pendientes" : name}
          </span>
        </Title>
        <p className="mt-1 text-[13px] text-muted">{mine ? "Tus tareas abiertas en todos los proyectos, por vencimiento." : `Lo que tiene a cargo ${name} y por dónde anduvo.`}</p>
      </div>
      <Section title="Pendientes" n={tasks.length}>
        {tasks.length ? tasks.map((t) => <TaskRow key={t.id} t={t} today={dayKey(now)} label={(t.projectSlug && bySlug.get(t.projectSlug)?.name) || "Sin proyecto"} />) : <Empty>Nada pendiente.</Empty>}
      </Section>
      <Section title={mine ? "Tus últimas salas" : "Últimas salas que visitó"}>
        {seen.length ? (
          seen.map(([slug, at]) => (
            <li key={slug} className="flex justify-between gap-3 py-2 text-[13px]">
              <span className="truncate text-foreground">{bySlug.get(slug)?.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted">{daysLabel(daysSince(at, now))}</span>
            </li>
          ))
        ) : (
          <Empty>Todavía no entró a ninguna.</Empty>
        )}
      </Section>
    </>
  );
}

function Reception({ events, bySlug, now }: { events: OfiEvent[]; bySlug: Map<string, OfiProject>; now: number }) {
  return (
    <>
      <div>
        <Eyebrow>Recepción</Eyebrow>
        <Title>Lo último en el estudio</Title>
        <p className="mt-1 text-[13px] text-muted">Lo mismo que pasa por el cartel de la pared.</p>
      </div>
      <Section title="Movimientos">
        {events.length ? events.map((e) => <EventRow key={e.id} e={e} now={now} extra={e.projectSlug ? bySlug.get(e.projectSlug)?.name : undefined} />) : <Empty>Todavía no hay movimientos.</Empty>}
      </Section>
    </>
  );
}
