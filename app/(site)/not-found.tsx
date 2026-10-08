import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { Magnetic } from "@/components/ui/magnetic";

// 404 del sitio, con navbar y footer (va dentro de app/(site)/layout.tsx).
// Las URLs que no existen llegan acá por app/(site)/[...missing]/page.tsx.
export default function NotFound() {
  return (
    <main className="relative flex min-h-[85vh] items-center justify-center pt-24">
      {/* Resplandor de acento */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]"
      />

      <Container className="relative z-10 text-center">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Error 404
        </p>

        <h1 className="display mt-4 text-7xl text-foreground sm:text-8xl md:text-9xl">
          4<span className="text-accent">0</span>4
        </h1>

        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-muted md:text-xl">
          La página que buscás no existe o fue trasladada.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <ButtonLink href="/">
              <ArrowLeft size={16} />
              Volver al inicio
            </ButtonLink>
          </Magnetic>

          <Magnetic>
            <ButtonLink href="/#work" variant="secondary">
              Ver proyectos
              <ArrowUpRight size={16} />
            </ButtonLink>
          </Magnetic>
        </div>
      </Container>
    </main>
  );
}
