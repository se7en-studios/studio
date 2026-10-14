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
    <section id="en-vivo" className="border-t border-border py-20 md:py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="mb-5 font-mono text-xs tracking-widest text-muted uppercase">
            <span className="text-accent">●</span> En vivo
          </p>
          <h2 className="display text-4xl uppercase text-foreground md:text-6xl">
            <RevealText>Así laburamos, en vivo.</RevealText>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Cada sala es un proyecto en producción, con su sitio en la tele. Si
            estamos conectados nos ves trabajando; si no, el guía te los muestra
            uno por uno.
          </p>
        </div>
        <div ref={ref} className="mt-12">
          {near ? <EnVivoMap active={inView} /> : <MapFrame />}
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
