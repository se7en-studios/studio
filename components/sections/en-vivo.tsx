"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { RevealText } from "@/components/ui/reveal-text";
import { projects } from "@/data/projects";
import { MapFrame } from "./en-vivo-frame";

// El mapa (motor, arte y tipografías) recién se baja cuando la sección está por
// entrar en pantalla: no suma nada a la carga de la landing.
const EnVivoMap = dynamic(() => import("./en-vivo-map").then((m) => m.EnVivoMap), {
  ssr: false,
  loading: () => <MapFrame />,
});

export function EnVivo() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="en-vivo" className="border-t border-border py-14 md:py-20">
      <Container>
        {/* Una ventanita, como una cámara del estudio: no compite con el resto de la página. */}
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-12">
          <div className="max-w-md">
            <p className="mb-4 font-mono text-xs tracking-widest text-muted uppercase">
              <span className="text-accent">●</span> En vivo
            </p>
            <h2 className="display text-3xl uppercase text-foreground md:text-4xl">
              <RevealText>Así laburamos.</RevealText>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Cada sala es un proyecto en producción, con su sitio en la tele.
              Si estamos conectados nos ves trabajando; si no, el guía te los
              muestra uno por uno.
            </p>
          </div>
          <div ref={ref}>{near ? <EnVivoMap active={inView} /> : <MapFrame />}</div>
        </div>
        {/* Para teclado y lectores de pantalla: el mapa se recorre con el mouse. */}
        <ul className="sr-only">
          {projects.map((p) => (
            <li key={p.slug}>
              <a href={`/work/${p.slug}`}>{p.name}</a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
