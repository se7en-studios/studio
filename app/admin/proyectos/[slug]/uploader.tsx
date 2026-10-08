"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";
import { finishUpload, prepareUpload } from "../actions";

type Item = { name: string; progress: number; failed?: boolean };

/**
 * Arrastrar y soltar. Cada archivo va directo del navegador a Storage con una
 * URL firmada (XHR para poder mostrar el avance); después se registra todo
 * junto, así el feed cuenta «subió 5 archivos» en una sola línea.
 */
export function Uploader({
  slug,
  folders,
  initialFolder,
  maxBytes,
  maxFiles,
}: {
  slug: string;
  folders: { id: string; label: string }[];
  initialFolder: string;
  maxBytes: number;
  maxFiles: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState(initialFolder);
  const [over, setOver] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  async function send(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length || busy) return;
    if (files.length > maxFiles) return setMsg({ text: `Hasta ${maxFiles} archivos por vez.`, error: true });
    const big = files.find((f) => f.size > maxBytes);
    if (big) return setMsg({ text: `«${big.name}» pesa más de 50 MB, el máximo por archivo.`, error: true });

    setBusy(true);
    setMsg(null);
    setItems(files.map((f) => ({ name: f.name, progress: 0 })));
    const prep = await prepareUpload(slug, folder, files.map((f) => ({ name: f.name, size: f.size, type: f.type })));
    if (!prep.targets) {
      setMsg({ text: prep.error ?? "No se pudo preparar la subida.", error: true });
      setItems([]);
      setBusy(false);
      return;
    }

    const targets = prep.targets;
    const results = await Promise.all(
      files.map((f, i) =>
        put(targets[i].url, f, (p) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, progress: p } : it))))
          .then(() => ({ path: targets[i].path, name: f.name, size: f.size, type: f.type }))
          .catch(() => {
            setItems((prev) => prev.map((it, j) => (j === i ? { ...it, failed: true } : it)));
            return null;
          }),
      ),
    );
    const done = results.filter((r): r is NonNullable<typeof r> => r !== null);
    const saved = done.length ? await finishUpload(slug, folder, done) : {};
    const failed = files.length - done.length;
    if (saved.error) setMsg({ text: saved.error, error: true });
    else if (failed) setMsg({ text: `${done.length} subidos, ${failed} con error. Probá de nuevo con los que faltan.`, error: true });
    else setMsg({ text: done.length === 1 ? "Archivo subido." : `${done.length} archivos subidos.` });
    setItems([]);
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        send(e.dataTransfer.files);
      }}
      className={`rounded-2xl border border-dashed p-5 transition-colors ${over ? "border-accent bg-accent/5" : "border-border bg-surface/50"}`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-accent">
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Upload size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">{busy ? "Subiendo…" : "Arrastrá archivos acá"}</p>
          <p className="text-xs text-muted">Imágenes, videos, PDFs y cualquier otro archivo. Hasta 50 MB cada uno, {maxFiles} por vez.</p>
        </div>
        <select
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          disabled={busy}
          aria-label="Carpeta donde se guardan"
          className="focus-ring rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          Elegir archivos
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => send(e.target.files)} />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 text-xs">
              <span className="w-48 truncate text-foreground/90 sm:w-72">{it.name}</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className={`block h-full rounded-full ${it.failed ? "bg-red-400" : "bg-accent"}`}
                  style={{ width: `${it.failed ? 100 : Math.round(it.progress * 100)}%` }}
                />
              </span>
              <span className="w-10 text-right font-mono text-muted">{it.failed ? "error" : `${Math.round(it.progress * 100)}%`}</span>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className={`mt-3 text-sm ${msg.error ? "text-red-400" : "text-emerald-300"}`}>{msg.text}</p>}
    </div>
  );
}

/** Mismo pedido que hace supabase-js en uploadToSignedUrl, con avance. */
function put(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Sin conexión"));
    xhr.send(body);
  });
}
