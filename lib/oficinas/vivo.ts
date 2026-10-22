"use client";

// El canal en vivo de la oficina: los que la tienen abierta (la landing a
// pantalla completa y el mapa del panel) se ven moverse de verdad y se mandan
// gestos. Cada pestaña es dueña de su muñeco: avisa a qué baldosa va (o si se
// sentó) y los demás lo hacen caminar hasta ahí. Sin texto libre: sólo los
// gestos de GESTURES.
//
// Nadie mueve el muñeco de otro: cada pestaña arma un par de llaves que no
// sale del navegador, pide un pase firmado por el servidor con su llave
// pública (/admin/api/pase, ver lib/en-vivo-pase.ts) y firma cada mensaje. Los
// demás verifican el pase con la llave del servidor y el mensaje con la del
// pase; lo que no cierra, se tira.
//
// El transporte es Supabase Realtime (broadcast, sin tocar la base), un canal
// por entorno. En local no hay canal de Supabase: se ven las pestañas del
// mismo navegador (BroadcastChannel), así el desarrollo no toca producción.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorLook } from "./art";
import type { Engine, Gesture, LiveState } from "./engine";

export type { Gesture, LiveState };
export const GESTURES: readonly Gesture[] = ["hola", "corazon", "cafe"];
/** Alguien en el canal: su id (el del muñeco), cómo se ve y su nombre si es uno de los socios. */
export type LivePerson = { id: string; look: ActorLook; name: string | null };
/** Un gesto que te mandaron. */
export type Heard = { from: string; g: Gesture; at: number };

const PASS_URL = "/admin/api/pase";
/** Cada cuánto cada uno repite dónde está (con su pase), y cuánto sin noticias hasta darlo por ido. */
const BEAT_MS = 20_000;
const GONE_MS = 50_000;
/** Entre dos avisos de movimiento, como mínimo; y entre dos gestos tuyos. */
const MOVE_MS = 120;
const GESTURE_MS = 1200;
/** Más gestos que esto en 10 s de una misma persona, se ignoran. */
const GESTURE_CAP = 4;
/** Margen para relojes corridos al mirar si un pase venció. */
const SKEW_MS = 10 * 60_000;

const ID = /^(federico|franco|v-[0-9a-f]{10})$/;
const LOOK = /^(federico|franco|v:[0-9a-f]{10})$/;
const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIG = { name: "ECDSA", hash: "SHA-256" } as const;

/** La hora de verdad (en las pruebas, Date.now puede estar corrido para ver la noche). */
const wall = () => performance.timeOrigin + performance.now();
const enc = new TextEncoder();
function b64u(bytes: ArrayBuffer | Uint8Array) {
  const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const c of a) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const importKey = (raw: string) => crypto.subtle.importKey("raw", unb64u(raw), ECDSA, false, ["verify"]);
const verify = (key: CryptoKey, sig: string, data: string) => crypto.subtle.verify(SIG, key, unb64u(sig), enc.encode(data)).catch(() => false);

/**
 * Lo que viaja: `t` el tipo (st: dónde está, gx: un gesto, by: se va), `i` de
 * quién, `q` su número de mensaje (sólo sube: lo repetido se tira), `d` el
 * contenido en JSON y `z` la firma de `t|i|q|d`. Con `p` y `s`, su pase.
 */
type Wire = { t: "st" | "gx" | "by"; i: string; q: number; d: string; z: string; p?: string; s?: string };
type Pass = { i: string; l: ActorLook; n: string | null; e: number; k: string };
type Peer = { pass: string; key: CryptoKey; exp: number; look: ActorLook; name: string | null; q: number; last: number; gx: number[] };
type Transport = { send: (w: Wire) => void; close: () => void };

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
function wireOf(v: unknown): Wire | null {
  if (!v || typeof v !== "object") return null;
  const w = v as Record<string, unknown>;
  if (w.t !== "st" && w.t !== "gx" && w.t !== "by") return null;
  if (!str(w.i, 16) || !ID.test(w.i) || typeof w.q !== "number" || !Number.isSafeInteger(w.q) || !str(w.d, 120) || !str(w.z, 100)) return null;
  if (w.p !== undefined && (!str(w.p, 400) || !str(w.s, 100))) return null;
  return w as Wire;
}
function passOf(p: string): Pass | null {
  try {
    const b = JSON.parse(new TextDecoder().decode(unb64u(p))) as Pass;
    if (!str(b.i, 16) || !ID.test(b.i) || !str(b.l, 16) || !LOOK.test(b.l) || typeof b.e !== "number" || !str(b.k, 87)) return null;
    if (b.n !== null && !str(b.n, 24)) return null;
    return b;
  } catch {
    return null;
  }
}
/** Una baldosa razonable (el mapa mide menos de 100 de lado). */
const tile = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 200;

async function supabaseTransport(topic: string, onWire: (w: unknown) => void, onBack: () => void): Promise<Transport | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const ch = sb.channel(topic, { config: { broadcast: { self: false, ack: false } } });
  ch.on("broadcast", { event: "m" }, (m) => onWire(m.payload));
  let joined = false;
  const ok = await new Promise<boolean>((res) => {
    const t = window.setTimeout(() => res(false), 10_000);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(t);
        // Si se cortó y volvió, hay que avisar de nuevo dónde está cada uno
        if (joined) onBack();
        joined = true;
        res(true);
      } else if (!joined && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
        window.clearTimeout(t);
        res(false);
      }
    });
  });
  const close = () => {
    void sb.removeChannel(ch).finally(() => sb.realtime.disconnect());
  };
  if (!ok) {
    close();
    return null;
  }
  return { send: (w) => void ch.send({ type: "broadcast", event: "m", payload: w }), close };
}
function localTransport(onWire: (w: unknown) => void): Transport | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const bc = new BroadcastChannel("se7en-en-vivo");
  bc.onmessage = (e) => onWire(e.data);
  return { send: (w) => bc.postMessage(w), close: () => bc.close() };
}

export type LiveConn = {
  me: LivePerson;
  /** Dónde está (o adónde va) tu muñeco. */
  send: (s: LiveState) => void;
  /** false si todavía no pasó el rato desde el gesto anterior. */
  gesture: (to: string, g: Gesture) => boolean;
  /** `data` firmado por esta pestaña, con su pase: para pedirle algo al servidor (el aviso a un socio). */
  sign: (data: string) => Promise<{ p: string; s: string; z: string }>;
  close: () => void;
};
type Handlers = {
  onPeople: (people: LivePerson[]) => void;
  onState: (id: string, s: LiveState | null) => void;
  onGesture: (from: string, to: string, g: Gesture) => void;
};

/** Entra al canal. null si no se puede (sin pase, sin Supabase, sin criptografía): la oficina sigue sin el canal. */
export async function joinLive(as: "visita" | "panel", h: Handlers, current: () => LiveState | null): Promise<LiveConn | null> {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const pair = (await crypto.subtle.generateKey(ECDSA, false, ["sign", "verify"])) as CryptoKeyPair;
    const pub = b64u(await crypto.subtle.exportKey("raw", pair.publicKey));
    const ask = async () => {
      const r = await fetch(PASS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: pub, as }) });
      if (!r.ok) return null;
      const j = (await r.json()) as { pass: string; sig: string; server: string; topic: string | null };
      const body = passOf(j.pass);
      return body && body.k === pub ? { ...j, body } : null;
    };
    const first = await ask();
    if (!first) return null;
    let mine = first;
    const server = await importKey(first.server);
    const me: LivePerson = { id: first.body.i, look: first.body.l, name: first.body.n };

    const peers = new Map<string, Peer>();
    const checked = new Map<string, Pass | null>();
    const people = () => [...peers.entries()].map(([id, p]) => ({ id, look: p.look, name: p.name }));
    let transport: Transport | null = null;
    let closed = false;
    let q = 0;
    let out = Promise.resolve();
    const post = (t: Wire["t"], d: string, withPass = false) => {
      if (closed && t !== "by") return out;
      const w: Omit<Wire, "z"> = { t, i: me.id, q: ++q, d, ...(withPass ? { p: mine.pass, s: mine.sig } : {}) };
      // En orden: la firma es asíncrona y los números tienen que llegar subiendo
      out = out
        .then(async () => {
          const z = b64u(await crypto.subtle.sign(SIG, pair.privateKey, enc.encode(`${w.t}|${w.i}|${w.q}|${w.d}`)));
          transport?.send({ ...w, z });
        })
        .catch(() => {});
      return out;
    };
    const state = (hi = false) => {
      const s = current();
      return post("st", JSON.stringify(s ? { x: s.x, y: s.y, sit: s.sit, ...(hi ? { hi: true } : {}) } : { hi }), true);
    };

    // Lo que llega, de a uno (las verificaciones son asíncronas y el orden importa)
    let inbox = Promise.resolve();
    let replyAt = 0, askedAt = 0;
    const receive = async (raw: unknown) => {
      const w = wireOf(raw);
      if (!w || w.i === me.id || closed) return;
      let peer = peers.get(w.i);
      const fresh = !peer;
      if (w.p && w.s && w.p !== peer?.pass) {
        let body = checked.get(w.p);
        if (body === undefined) {
          body = (await verify(server, w.s, w.p)) ? passOf(w.p) : null;
          if (checked.size > 64) checked.clear();
          checked.set(w.p, body);
        }
        // Un pase de otro, vencido, o más viejo que el que ya tenemos (otra pestaña de la misma visita): no
        if (!body || body.i !== w.i || body.e < wall() - SKEW_MS || (peer && body.e < peer.exp)) return;
        peer = { pass: w.p, key: await importKey(body.k), exp: body.e, look: body.l, name: body.n, q: -1, last: 0, gx: [] };
      }
      if (!peer) {
        // Alguien que todavía no conocemos: que todos repitan dónde están, con su pase
        if (wall() - askedAt > 5000) {
          askedAt = wall();
          void state(true);
        }
        return;
      }
      if (w.q <= peer.q || !(await verify(peer.key, w.z, `${w.t}|${w.i}|${w.q}|${w.d}`))) return;
      peer.q = w.q;
      peer.last = wall();
      if (!peers.has(w.i) || peers.get(w.i) !== peer) {
        peers.set(w.i, peer);
        if (fresh) h.onPeople(people());
      }
      if (w.t === "by") {
        peers.delete(w.i);
        h.onState(w.i, null);
        h.onPeople(people());
        return;
      }
      let d: Record<string, unknown>;
      try {
        d = JSON.parse(w.d) as Record<string, unknown>;
      } catch {
        return;
      }
      if (w.t === "st") {
        if (tile(d.x) && tile(d.y)) h.onState(w.i, { x: d.x, y: d.y, sit: d.sit === true });
        // Uno nuevo pregunta: se le contesta (un rato al azar después, para no responder todos juntos)
        if (d.hi === true && wall() > replyAt) {
          replyAt = wall() + 1000;
          window.setTimeout(() => void state(), 150 + Math.random() * 700);
        }
      } else if (w.t === "gx" && str(d.to, 16) && ID.test(d.to) && GESTURES.includes(d.g as Gesture)) {
        const now = wall();
        peer.gx = peer.gx.filter((t) => now - t < 10_000);
        if (peer.gx.length >= GESTURE_CAP) return;
        peer.gx.push(now);
        h.onGesture(w.i, d.to, d.g as Gesture);
      }
    };
    const onWire = (raw: unknown) => {
      inbox = inbox.then(() => receive(raw)).catch(() => {});
    };

    transport = mine.topic ? await supabaseTransport(mine.topic, onWire, () => void state(true)) : localTransport(onWire);
    if (!transport) return null;
    void state(true);

    // Cada tanto: dónde estás (con el pase) y quién dejó de dar noticias
    const beat = window.setInterval(() => {
      void state();
      const now = wall();
      let gone = false;
      for (const [id, p] of peers)
        if (now - p.last > GONE_MS) {
          peers.delete(id);
          h.onState(id, null);
          gone = true;
        }
      if (gone) h.onPeople(people());
    }, BEAT_MS);
    // Un pase nuevo para la misma llave antes de que venza este
    const renew = window.setInterval(() => {
      if (mine.body.e - wall() < 15 * 60_000) void ask().then((p) => p && (mine = p));
    }, 5 * 60_000);

    let moveT = 0, moveAt = 0, gestureAt = 0;
    return {
      me,
      send() {
        // Un aviso por vez: si llegan varios juntos (las flechas), va el último
        if (moveT || closed) return;
        const wait = Math.max(0, moveAt + MOVE_MS - wall());
        moveT = window.setTimeout(() => {
          moveT = 0;
          moveAt = wall();
          const s = current();
          if (s) void post("st", JSON.stringify({ x: s.x, y: s.y, sit: s.sit }));
        }, wait);
      },
      async sign(data) {
        const z = b64u(await crypto.subtle.sign(SIG, pair.privateKey, enc.encode(data)));
        return { p: mine.pass, s: mine.sig, z };
      },
      gesture(to, g) {
        if (closed || wall() - gestureAt < GESTURE_MS || !peers.has(to)) return false;
        gestureAt = wall();
        void post("gx", JSON.stringify({ to, g }));
        return true;
      },
      close() {
        if (closed) return;
        closed = true;
        window.clearInterval(beat);
        window.clearInterval(renew);
        window.clearTimeout(moveT);
        const t = transport;
        void post("by", "").finally(() => t?.close());
        peers.clear();
      },
    };
  } catch {
    return null;
  }
}

/**
 * El canal para un mapa: entra mientras `on` y la pestaña está a la vista (al
 * ocultarla sale, como la señal de visitas), le pasa al motor dónde está cada
 * uno y los gestos, y devuelve quiénes están, quién sos y el último gesto que
 * te mandaron. `report` va en onState del motor; `gesture`, en los botones;
 * `leave` sale del canal ya (al despedirse: los demás te ven irte al toque).
 */
export function useLive(on: boolean, as: "visita" | "panel", engine: Engine | null) {
  const [me, setMe] = useState<LivePerson | null>(null);
  const [people, setPeople] = useState<LivePerson[]>([]);
  const [heard, setHeard] = useState<Heard | null>(null);
  const [visible, setVisible] = useState(true);
  const conn = useRef<LiveConn | null>(null);
  const last = useRef<LiveState | null>(null);
  const states = useRef(new Map<string, LiveState>());
  const eng = useRef(engine);

  useEffect(() => {
    eng.current = engine;
    // Un motor nuevo (cambió el mapa): cada uno vuelve a donde estaba
    if (engine) for (const [id, s] of states.current) engine.setRemote(id, s);
  }, [engine]);

  useEffect(() => {
    const f = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);

  useEffect(() => {
    if (!on || !visible) return;
    let gone = false;
    let c: LiveConn | null = null;
    const seen = states.current;
    void joinLive(
      as,
      {
        onPeople: (p) => !gone && setPeople(p),
        onState: (id, s) => {
          if (s) seen.set(id, s);
          else seen.delete(id);
          eng.current?.setRemote(id, s);
        },
        onGesture: (from, to, g) => {
          eng.current?.gesture(from, to, g);
          if (!gone && c && to === c.me.id) setHeard({ from, g, at: Date.now() });
        },
      },
      () => last.current,
    ).then((x) => {
      if (gone) return x?.close();
      c = x;
      conn.current = x;
      if (x) setMe(x.me);
    });
    const bye = () => c?.close();
    window.addEventListener("pagehide", bye);
    return () => {
      gone = true;
      window.removeEventListener("pagehide", bye);
      c?.close();
      conn.current = null;
      setPeople([]);
      for (const id of seen.keys()) eng.current?.setRemote(id, null);
      seen.clear();
    };
  }, [on, visible, as]);

  const report = useCallback((s: LiveState) => {
    last.current = s;
    conn.current?.send(s);
  }, []);
  const gesture = useCallback((to: string, g: Gesture) => {
    const c = conn.current;
    if (!c || !c.gesture(to, g)) return false;
    eng.current?.gesture(c.me.id, to, g);
    return true;
  }, []);
  const leave = useCallback(() => conn.current?.close(), []);
  /**
   * «Avisale que estás acá»: le llega al celular a ese socio, que no está
   * mirando la oficina (ver /api/en-vivo/aviso). "sent", "again" (ya le
   * avisaste hace poco) o "fail" (sin canal, o el servidor no pudo).
   */
  const call = useCallback(async (to: "federico" | "franco"): Promise<"sent" | "again" | "fail"> => {
    const c = conn.current;
    if (!c) return "fail";
    try {
      const d = JSON.stringify({ to, t: Math.round(wall()) });
      const r = await fetch("/api/en-vivo/aviso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(await c.sign(`aviso|${d}`)), d }) });
      const j = (await r.json().catch(() => null)) as { sent?: boolean; again?: boolean } | null;
      return j?.sent ? "sent" : j?.again ? "again" : "fail";
    } catch {
      return "fail";
    }
  }, []);
  return { me, people, heard, report, gesture, leave, call };
}
