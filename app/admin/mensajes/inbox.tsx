"use client";

// Lista de conversaciones a la izquierda, la conversación elegida a la
// derecha. Cambiar de conversación sólo cambia la URL (?c=…), sin recargar.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FolderKanban, Hash, Inbox as InboxIcon, Plus } from "lucide-react";
import { ago } from "@/lib/admin/brief";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { GENERAL, leadChannel, parseChannel, projectChannel, type ChannelSummary, type Message } from "@/lib/admin/message-shared";
import { cn } from "../kit";
import { Chat } from "./chat";

export function Inbox({
  me,
  channel: initialChannel,
  summaries: initial,
  projects,
  leads,
}: {
  me: LeadOwner;
  channel: string;
  summaries: ChannelSummary[];
  projects: Record<string, string>;
  leads: Record<string, string>;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState(initialChannel);
  const [summaries, setSummaries] = useState(initial);
  const [picking, setPicking] = useState(false);

  const title = (c: string) => {
    const p = parseChannel(c);
    if (p.kind === "proyecto") return projects[p.slug] ?? p.slug;
    if (p.kind === "pedido") return leads[p.id] ?? "Pedido";
    return "General";
  };

  const list = useMemo(() => {
    const by = new Map(summaries.map((s) => [s.channel, s]));
    if (!by.has(GENERAL)) by.set(GENERAL, { channel: GENERAL, last: null, unread: 0 });
    if (!by.has(channel)) by.set(channel, { channel, last: null, unread: 0 });
    return [...by.values()].sort((a, b) => {
      if (a.channel === GENERAL) return -1;
      if (b.channel === GENERAL) return 1;
      return (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "");
    });
  }, [summaries, channel]);

  function open(c: string) {
    setChannel(c);
    setPicking(false);
    setSummaries((ss) => ss.map((s) => (s.channel === c ? { ...s, unread: 0 } : s)));
    router.replace(c === GENERAL ? "/admin/mensajes" : `/admin/mensajes?c=${encodeURIComponent(c)}`, { scroll: false });
  }

  function onActivity(last: Message | null) {
    setSummaries((ss) => {
      const has = ss.some((s) => s.channel === channel);
      if (!last && !has) return ss;
      const next = { channel, last, unread: 0 };
      return has ? ss.map((s) => (s.channel === channel ? next : s)) : [...ss, next];
    });
  }

  const parsed = parseChannel(channel);
  const link =
    parsed.kind === "proyecto" ? `/admin/proyectos/${parsed.slug}` : parsed.kind === "pedido" ? `/admin/pedidos?pedido=${parsed.id}` : null;

  return (
    <div className="grid h-[calc(100dvh-210px)] min-h-[480px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={cn("flex min-h-0 flex-col border-[var(--line)] md:border-r", "max-md:hidden")}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <p className="text-[13px] font-medium">Conversaciones</p>
          <button
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
            className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-muted hover:bg-white/[0.05] hover:text-foreground"
          >
            <Plus size={13} /> Nueva
          </button>
        </div>
        {picking && <Picker projects={projects} leads={leads} onPick={open} />}
        <ul className="admin-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {list.map((s) => {
            const p = parseChannel(s.channel);
            const on = s.channel === channel;
            return (
              <li key={s.channel}>
                <button
                  onClick={() => open(s.channel)}
                  className={cn(
                    "focus-ring flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    on ? "bg-white/[0.07]" : "hover:bg-white/[0.035]",
                  )}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-white/[0.03] text-muted">
                    {p.kind === "general" ? <Hash size={14} /> : p.kind === "proyecto" ? <FolderKanban size={14} /> : <InboxIcon size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={cn("truncate text-[13px]", s.unread ? "font-semibold text-foreground" : "text-foreground/90")}>{title(s.channel)}</span>
                      {s.last && <span className="ml-auto shrink-0 text-[10.5px] text-muted">{ago(s.last.created_at).replace("hace ", "")}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn("truncate text-[12px]", s.unread ? "text-foreground/80" : "text-muted")}>
                        {s.last ? `${s.last.author === me ? "Vos" : PEOPLE[s.last.author].name}: ${s.last.body}` : "Sin mensajes"}
                      </span>
                      {s.unread > 0 && (
                        <span className="ml-auto shrink-0 rounded-full bg-accent px-1.5 py-px font-mono text-[10px] font-medium text-background">{s.unread}</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <select
            value={channel}
            onChange={(e) => open(e.target.value)}
            aria-label="Conversación"
            className="focus-ring rounded-md border border-[var(--line-strong)] bg-black/30 px-2 py-1 text-[13px] md:hidden"
          >
            {list.map((s) => (
              <option key={s.channel} value={s.channel}>
                {title(s.channel)}
                {s.unread ? ` (${s.unread})` : ""}
              </option>
            ))}
          </select>
          <p className="hidden min-w-0 items-center gap-2 text-[14px] font-medium md:flex">
            {parsed.kind === "general" ? <Hash size={15} className="text-muted" /> : null}
            <span className="truncate">{title(channel)}</span>
          </p>
          <span className="hidden text-[12px] text-muted lg:inline">
            {parsed.kind === "general" ? "Todo el equipo" : parsed.kind === "proyecto" ? "Conversación del proyecto" : "Conversación del pedido"}
          </span>
          {link && (
            <Link href={link} className="focus-ring ml-auto inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground">
              Abrir {parsed.kind} <ArrowUpRight size={13} />
            </Link>
          )}
        </header>
        <Chat
          key={channel}
          channel={channel}
          me={me}
          className="min-h-0 flex-1"
          onActivity={onActivity}
          placeholder={parsed.kind === "general" ? "Escribile al equipo…" : `Escribí sobre ${title(channel)}…`}
        />
      </section>
    </div>
  );
}

function Picker({
  projects,
  leads,
  onPick,
}: {
  projects: Record<string, string>;
  leads: Record<string, string>;
  onPick: (c: string) => void;
}) {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const items = [
    ...Object.entries(projects).map(([slug, name]) => ({ c: projectChannel(slug), name, kind: "Proyecto" })),
    ...Object.entries(leads).map(([id, name]) => ({ c: leadChannel(id), name, kind: "Pedido" })),
  ].filter((i) => !q || norm(i.name).includes(norm(q)));
  return (
    <div className="border-b border-[var(--line)] p-2">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Proyecto o pedido…"
        className="focus-ring w-full rounded-md border border-[var(--line-strong)] bg-black/30 px-2.5 py-1.5 text-[13px] placeholder:text-muted/60"
      />
      <ul className="admin-scroll mt-1 max-h-56 overflow-y-auto">
        {items.slice(0, 50).map((i) => (
          <li key={i.c}>
            <button onClick={() => onPick(i.c)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] hover:bg-white/[0.05]">
              <span className="truncate">{i.name}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">{i.kind}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
