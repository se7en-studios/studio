import Image from "next/image";
import type { ReactNode } from "react";
import type { ProjectGallery } from "@/types";

/**
 * El producto por dentro, para los casos que son más que su sitio: las capturas de
 * escritorio van a todo el ancho (ya traen el monitor dibujado) y las de celular en
 * fila, con el marco del teléfono puesto acá.
 */
export function ProductGallery({ gallery }: { gallery: ProjectGallery }) {
  const desktop = gallery.shots.filter((s) => s.kind === "desktop");
  const mobile = gallery.shots.filter((s) => s.kind === "mobile");

  return (
    <section className="mt-20" aria-labelledby="producto-por-dentro">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">Por dentro</p>
      <h2 id="producto-por-dentro" className="display mt-3 text-3xl text-foreground md:text-4xl">
        El producto en uso
      </h2>
      {gallery.note && <p className="mt-3 max-w-2xl text-sm text-muted">{gallery.note}</p>}

      {desktop.length > 0 && (
        <div className="mt-10">
          <GroupLabel>{gallery.labels.desktop}</GroupLabel>
          <div className="mt-5 space-y-10">
            {desktop.map((shot) => (
              <figure key={shot.src} className="mx-auto max-w-6xl">
                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    sizes="(min-width: 1200px) 1152px, 100vw"
                    className="h-auto w-full"
                  />
                </div>
                <figcaption className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {mobile.length > 0 && (
        <div className="mt-16">
          <GroupLabel>{gallery.labels.mobile}</GroupLabel>
          {/* En el celular los teléfonos se deslizan de costado: apilados serían tres
              pantallas de alto cada uno. El -mx/px iguala el margen del Container. */}
          <div className="-mx-6 mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 sm:mx-auto sm:grid sm:max-w-5xl sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0">
            {mobile.map((shot) => (
              <figure key={shot.src} className="w-[68%] shrink-0 snap-center sm:w-auto">
                {/* El bisel es oscuro también en el tema claro: es el teléfono, no la página. */}
                <div className="mx-auto max-w-[300px] rounded-[2.4rem] bg-neutral-950 p-2 shadow-2xl ring-1 ring-white/10">
                  <div className="overflow-hidden rounded-[2rem]">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={shot.width}
                      height={shot.height}
                      sizes="(min-width: 640px) 300px, 68vw"
                      className="h-auto w-full"
                    />
                  </div>
                </div>
                <figcaption className="mx-auto mt-4 max-w-[300px] text-sm leading-relaxed text-muted">
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-3 font-mono text-xs tracking-widest text-muted uppercase">
      <span className="h-px w-8 bg-border" aria-hidden />
      {children}
    </h3>
  );
}
