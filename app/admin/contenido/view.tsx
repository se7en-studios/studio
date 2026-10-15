"use client";

// Panel de contenido: un bloque por día con lo que hay que subir. El tilde de
// «publicado» es optimista (se ve al instante y se revierte si el servidor falla).
// Los posts se crean, editan y reprograman acá; los archivos siguen yendo por
// scripts/seed-content.mjs.
import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Download, FileVideo, Pencil, Pin, Plus, X } from "lucide-react";
import {
  KINDS,
  KIND_LABEL,
  POST_TITLE_MAX,
  type ContentFile,
  type ContentPost,
  type PostInput,
} from "@/lib/admin/content-shared";
import { dayIn } from "@/lib/admin/tz";
import { Card, Chip, Empty, btnGhost, btnPrimary, btnSecondary, cn, input, label } from "../kit";
import { Dialog, useToast } from "../overlay";
import { markPublished, savePost } from "./actions";

type Filter = "pendientes" | "publicados" | "todo";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "pendientes", label: "Pendientes" },
  { id: "publicados", label: "Publicados" },
  { id: "todo", label: "Todo" },
];

const KIND_TONE: Record<ContentPost["kind"], string> = {
  reel: "text-[#ff6a4a] border-[#ff6a4a]/40",
  carrusel: "text-emerald-400 border-emerald-400/40",
  historias: "text-violet-300 border-violet-300/40",
  perfil: "text-muted border-[var(--line-strong)]",
};

const todayKey = () => dayIn(Date.now());

function dateLabel(day: string) {
  // Mediodía UTC: el día no se corre por la zona horaria.
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ContentView({ posts }: { posts: ContentPost[] }) {
  const flash = useToast();
  const [items, setItems] = useState(posts);
  const [filter, setFilter] = useState<Filter>("pendientes");
  const [, start] = useTransition();
  /** null: cerrado; "new": alta; un post: editándolo. */
  const [editing, setEditing] = useState<ContentPost | "new" | null>(null);
  const today = todayKey();

  function saved(post: ContentPost) {
    setItems((xs) => {
      const old = xs.find((x) => x.id === post.id);
      // Editar no toca los archivos: quedan los que ya estaban, con sus URLs.
      const next = old ? xs.map((x) => (x.id === post.id ? { ...post, files: old.files } : x)) : [...xs, post];
      return next.sort((a, b) => a.post_date.localeCompare(b.post_date) || a.id.localeCompare(b.id));
    });
    setEditing(null);
    const moved = editing !== null && editing !== "new" && editing.post_date !== post.post_date;
    flash(moved ? "Post reprogramado" : "Post guardado", "ok");
  }

  const done = items.filter((p) => p.done_at).length;
  const next = items.find((p) => !p.done_at && p.post_date >= today);
  const shown = useMemo(
    () =>
      items.filter((p) =>
        filter === "todo"
          ? true
          : filter === "publicados"
            ? p.done_at
            : !p.done_at,
      ),
    [items, filter],
  );

  function toggle(post: ContentPost) {
    const nowDone = !post.done_at;
    const apply = (at: string | null) =>
      setItems((xs) =>
        xs.map((x) => (x.id === post.id ? { ...x, done_at: at } : x)),
      );
    apply(nowDone ? new Date().toISOString() : null);
    start(async () => {
      const res = await markPublished(post.id, nowDone);
      if (res.error) {
        apply(post.done_at);
        flash(res.error, "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted">
          <b className="text-foreground tabular-nums">{done}</b> de{" "}
          {items.length} publicados
          {next && (
            <>
              {" · "}Próximo:{" "}
              <b className="text-foreground">{dateLabel(next.post_date)}</b>,{" "}
              {next.title}
            </>
          )}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
            <Plus size={14} /> Nuevo post
          </button>
          {FILTERS.map((f) => (
            <Chip
              key={f.id}
              on={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty
          title={
            filter === "pendientes"
              ? "No queda nada por publicar"
              : "Nada para mostrar"
          }
        />
      ) : (
        <ul className="space-y-4">
          {shown.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              isToday={p.post_date === today}
              onToggle={() => toggle(p)}
              onEdit={() => setEditing(p)}
            />
          ))}
        </ul>
      )}
      {editing && (
        <PostDialog
          post={editing === "new" ? null : editing}
          defaultDate={today}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  isToday,
  onToggle,
  onEdit,
}: {
  post: ContentPost;
  isToday: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const published = Boolean(post.done_at);
  return (
    <li>
      <Card
        className={cn(isToday && "border-accent/50", published && "opacity-60")}
      >
        <div className="space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <span className="inline-block first-letter:uppercase">{dateLabel(post.post_date)}</span>
                <span>· 19 h</span>
                {isToday && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
                    Hoy
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px]",
                    KIND_TONE[post.kind],
                  )}
                >
                  {KIND_LABEL[post.kind]}
                </span>
                {post.pinned && (
                  <span className="inline-flex items-center gap-1 text-accent">
                    <Pin size={12} /> Fijar en el perfil
                  </span>
                )}
              </p>
              <h2
                className={cn(
                  "mt-1 text-[18px] font-semibold tracking-[-0.015em] text-foreground",
                  published && "line-through",
                )}
              >
                {post.title}
              </h2>
            </div>
            <button type="button" onClick={onEdit} aria-label={`Editar o reprogramar «${post.title}»`} className={btnGhost}>
              <Pencil size={14} /> Editar
            </button>
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={published}
              className={cn(
                btnSecondary,
                published && "border-emerald-400/50 text-emerald-300",
              )}
            >
              <Check size={14} /> {published ? "Publicado" : "Marcar publicado"}
            </button>
          </div>

          {post.steps && (
            <p className="text-[13px] leading-relaxed whitespace-pre-line text-foreground/90">
              {post.steps}
            </p>
          )}
          {post.tips.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">
              {post.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}

          {post.files.length > 0 && <Files files={post.files} />}
          {post.caption && <Caption text={post.caption} />}
        </div>
      </Card>
    </li>
  );
}

const isImg = (f: ContentFile) => f.mime.startsWith("image/");

function Files({ files }: { files: ContentFile[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
        Archivos, en este orden
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {files.map((f) => (
          <li key={f.name}>
            <a
              href={f.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              download={f.name}
              aria-label={`Descargar ${f.name}`}
              className="focus-ring group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--well)]"
            >
              {isImg(f) && f.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, no pasa por el optimizador
                <img
                  src={f.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileVideo size={22} className="text-muted" />
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/70 px-1.5 py-1 text-[10px] text-white">
                <span className="truncate">{f.name}</span>
                <Download size={11} className="shrink-0" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Caption({ text }: { text: string }) {
  const flash = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      flash("Caption copiado", "ok");
    } catch {
      flash("No se pudo copiar: seleccionalo a mano.", "error");
    }
  }
  return (
    <details>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-medium text-accent">
        Caption
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            copy();
          }}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--line-strong)] px-2 py-0.5 text-[11px] text-foreground hover:bg-white/[0.06]"
        >
          <Copy size={11} /> Copiar
        </button>
      </summary>
      <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--well)] p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
        {text}
      </pre>
    </details>
  );
}

/** Alta o edición de un post. Cambiar la fecha lo reprograma. */
function PostDialog({
  post,
  defaultDate,
  onClose,
  onSaved,
}: {
  post: ContentPost | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (post: ContentPost) => void;
}) {
  const [draft, setDraft] = useState<PostInput>(
    post
      ? { post_date: post.post_date, kind: post.kind, title: post.title, pinned: post.pinned, steps: post.steps, caption: post.caption, tips: post.tips }
      : { post_date: defaultDate, kind: "reel", title: "", pinned: false, steps: "", caption: "", tips: [] },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (p: Partial<PostInput>) => setDraft((d) => ({ ...d, ...p }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await savePost(post?.id ?? null, draft);
      if (res.post) onSaved(res.post);
      else setError(res.error ?? "No se pudo guardar");
    });
  }

  return (
    <Dialog onClose={onClose} label={post ? "Editar post" : "Nuevo post"}>
      <form onSubmit={submit} className="admin-scroll max-h-[92dvh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{post ? "Editar post" : "Nuevo post"}</h2>
          <button type="button" onClick={onClose} aria-label="Cancelar" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-white/[0.06] hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="cp-title" className={label}>
              Título
            </label>
            <input
              id="cp-title"
              required
              autoFocus
              maxLength={POST_TITLE_MAX}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Ej: Caso: Muzzaga Pádel"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="cp-date" className={label}>
              Fecha
            </label>
            <input
              id="cp-date"
              type="date"
              required
              value={draft.post_date}
              onChange={(e) => set({ post_date: e.target.value })}
              className={cn(input, "[color-scheme:dark]")}
            />
          </div>
          <div>
            <label htmlFor="cp-kind" className={label}>
              Tipo
            </label>
            <select id="cp-kind" value={draft.kind} onChange={(e) => set({ kind: e.target.value as PostInput["kind"] })} className={input}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-muted sm:col-span-2">
            <input type="checkbox" checked={draft.pinned} onChange={(e) => set({ pinned: e.target.checked })} className="accent-[var(--accent)]" />
            Fijar en el perfil
          </label>
          <div className="sm:col-span-2">
            <label htmlFor="cp-steps" className={label}>
              Qué hacer
            </label>
            <textarea id="cp-steps" rows={3} value={draft.steps} onChange={(e) => set({ steps: e.target.value })} className={cn(input, "py-2.5")} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cp-tips" className={label}>
              Consejos (uno por línea)
            </label>
            <textarea
              id="cp-tips"
              rows={2}
              value={draft.tips.join("\n")}
              onChange={(e) => set({ tips: e.target.value.split("\n") })}
              className={cn(input, "py-2.5")}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cp-caption" className={label}>
              Caption
            </label>
            <textarea id="cp-caption" rows={5} value={draft.caption} onChange={(e) => set({ caption: e.target.value })} className={cn(input, "py-2.5")} />
          </div>
        </div>
        {!post && <p className="mt-3 text-[12px] text-muted">Los archivos se suben con scripts/seed-content.mjs.</p>}
        {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={pending || !draft.title.trim()} className={btnPrimary}>
            {pending ? "Guardando…" : post ? "Guardar" : "Agendar post"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
