// Esqueletos de carga con la forma real de cada sección: la navegación
// responde en el clic y la página no salta cuando llegan los datos.
// Cada loading.tsx de una ruta exporta el suyo.
import { cn } from "./kit";

const Sk = ({ className }: { className: string }) => <div className={cn("admin-skeleton", className)} />;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-6">
      {children}
    </div>
  );
}

function Header({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Sk className="h-3 w-28 rounded" />
        <Sk className="h-8 w-56 rounded-lg" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Sk key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function Kpis({ n, cols }: { n: number; cols: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", cols)}>
      {Array.from({ length: n }, (_, i) => (
        <Sk key={i} className="h-[92px] rounded-xl" />
      ))}
    </div>
  );
}

const Filters = () => (
  <div className="flex flex-wrap gap-2">
    <Sk className="h-9 min-w-[220px] flex-1 rounded-lg" />
    <Sk className="h-9 w-64 rounded-lg" />
  </div>
);

/** Franjas de un tablero (Pedidos, Proyectos): la primera con tarjetas. */
function Rows({ n, card }: { n: number; card: string }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="rounded-xl border border-[var(--line)] p-2">
          <Sk className="mx-1.5 mt-1 mb-2.5 h-3.5 w-28 rounded" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: i === 0 ? 4 : i === 1 ? 2 : 0 }, (_, j) => (
              <Sk key={j} className={cn("shrink-0 rounded-lg", card)} />
            ))}
            {i > 1 && <Sk className="h-12 w-full rounded-lg" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Shell>
      <Header actions={3} />
      <Kpis n={5} cols="md:grid-cols-3 xl:grid-cols-5" />
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Sk className="h-[360px] rounded-xl" />
        <Sk className="h-[360px] rounded-xl" />
      </div>
    </Shell>
  );
}

export function LeadsSkeleton() {
  return (
    <Shell>
      <Header actions={2} />
      <Kpis n={6} cols="md:grid-cols-3 xl:grid-cols-6" />
      <Filters />
      <Rows n={5} card="h-[150px] w-[268px]" />
    </Shell>
  );
}

export function ProjectsSkeleton() {
  return (
    <Shell>
      <Header />
      <Filters />
      <Rows n={4} card="h-[190px] w-[208px]" />
    </Shell>
  );
}

export function ProjectSkeleton() {
  return (
    <Shell>
      <Sk className="h-3 w-40 rounded" />
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <Sk className="aspect-[16/10] rounded-xl" />
        <div className="space-y-3">
          <Sk className="h-5 w-32 rounded-md" />
          <Sk className="h-8 w-64 rounded-lg" />
          <Sk className="h-10 w-full max-w-2xl rounded-lg" />
        </div>
      </div>
      <Sk className="h-9 w-80 rounded-lg" />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Sk className="h-[420px] rounded-xl" />
        <Sk className="h-[420px] rounded-xl" />
      </div>
    </Shell>
  );
}

export function TasksSkeleton() {
  return (
    <Shell>
      <Header />
      <Kpis n={4} cols="md:grid-cols-4" />
      <Filters />
      <Sk className="h-[420px] rounded-xl" />
    </Shell>
  );
}
