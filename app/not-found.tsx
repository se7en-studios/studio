import Link from "next/link";

// 404 liviano para lo que no pasa por el sitio público (por ejemplo, un
// proyecto del panel que ya no existe). El del sitio está en
// app/(site)/not-found.tsx.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">Error 404</p>
      <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">Esto no existe</h1>
      <p className="max-w-sm text-sm text-muted">La página que buscás no existe o fue trasladada.</p>
      <div className="mt-2 flex gap-2 text-sm">
        <Link href="/admin" className="focus-ring rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-white/5">
          Ir al panel
        </Link>
        <Link href="/" className="focus-ring rounded-lg px-3 py-1.5 text-muted hover:text-foreground">
          Ir al sitio
        </Link>
      </div>
    </main>
  );
}
