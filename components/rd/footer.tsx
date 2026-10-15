"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { projects } from "@/data/projects";
import { SITE } from "@/data/site";
import { EASE_OUT } from "@/components/rd/primitives";

const NAV = [
  { href: "#trabajos", label: "Trabajos" },
  { href: "#servicios", label: "Servicios" },
  { href: "#proceso", label: "Proceso" },
  { href: "#estudio", label: "Estudio" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

/** Hora de Buenos Aires; null hasta montar para no desincronizar la hidratación. */
function useClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

export function RdFooter() {
  const time = useClock();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const year = new Date().getFullYear();
  const cases = [...projects].sort((a, b) => a.order - b.order).slice(0, 6);

  return (
    <footer
      data-theme="ink"
      className="relative -mt-10 overflow-hidden rounded-t-[2.5rem] bg-(--ink) pt-20 md:-mt-16 md:rounded-t-[4rem] md:pt-28"
    >
      <div className="rd-wrap grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="rd-display text-[clamp(1.8rem,3vw,3rem)]">
            Hecho a mano
            <br />
            en la <span className="rd-serif text-(--signal)">Patagonia</span>.
          </p>
          <p className="rd-label mt-6 flex items-center gap-2 text-(--paper)/60">
            <span className="relative flex h-2 w-2">
              <span className="rd-ping absolute inset-0 rounded-full bg-(--signal)" />
              <span className="relative h-2 w-2 rounded-full bg-(--signal)" />
            </span>
            {"Patagonia, AR · "}
            <span className="tabular-nums text-(--paper)">
              {time ?? "--:--:--"}
            </span>
          </p>
        </div>

        <FooterColumn title="Navegación" className="md:col-start-7">
          {NAV.map((l) => (
            <a key={l.href} href={l.href} className="rd-link">
              {l.label}
            </a>
          ))}
        </FooterColumn>
        <FooterColumn title="Casos">
          {cases.map((p) => (
            <Link key={p.slug} href={`/work/${p.slug}`} className="rd-link">
              {p.name}
            </Link>
          ))}
        </FooterColumn>
        <FooterColumn title="Contacto">
          <a href={`mailto:${SITE.email}`} className="rd-link break-all">
            {SITE.email}
          </a>
          <a
            href={SITE.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="rd-link"
          >
            WhatsApp
          </a>
          {/* El sitio anterior ya no es la home. */}
          <Link href="/services" className="rd-link">
            Sitio actual
          </Link>
        </FooterColumn>
      </div>

      <div className="rd-wrap mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-(--line) py-5 md:mt-24">
        <span className="rd-label text-(--paper)/50">
          {"© "}
          {year} {SITE.name}
        </span>
        <a href="#top" className="rd-label rd-link text-(--paper)/70">
          {"Volver arriba ↑"}
        </a>
      </div>

      <div
        ref={ref}
        aria-hidden
        className="flex justify-center overflow-hidden px-(--gutter) select-none"
      >
        {"SE7EN".split("").map((ch, i) => (
          <span key={i} className="rd-mask">
            <motion.span
              className={`rd-display block text-[29vw] leading-[0.74] ${
                ch === "7" ? "text-(--signal)" : "text-(--paper)"
              }`}
              initial={{ y: "100%" }}
              animate={inView ? { y: "12%" } : { y: "100%" }}
              transition={{ duration: 1.2, ease: EASE_OUT, delay: i * 0.07 }}
            >
              {ch}
            </motion.span>
          </span>
        ))}
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`md:col-span-2 ${className}`}>
      <p className="rd-label text-(--paper)/50">{title}</p>
      <div className="rd-body mt-5 flex flex-col items-start gap-2.5 text-base text-(--paper)/85">
        {children}
      </div>
    </div>
  );
}
