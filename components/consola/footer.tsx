"use client";

import Link from "next/link";
import { SITE } from "@/data/site";
import { RdLines } from "@/components/rd/primitives";
import { CsSection, useConsola } from "@/components/consola/section";
import { useClock } from "@/components/consola/shell";
import { MailButton, Socials, WhatsAppButton } from "@/components/consola/contact-buttons";
import { MarcaSe7en } from "@/components/consola/marca";

// Contacto y pie: al llegar acá el panel se vuelve el formulario. Arriba, el
// cierre comercial con la marca SE7EN en 3D (Flow) animada como firma.

const MAP = [
  { href: "#inicio", label: "Inicio" },
  { href: "#trabajos", label: "Trabajos" },
  { href: "#piezas", label: "Funciones" },
  { href: "#notas", label: "Notas" },
  { href: "#equipo", label: "Equipo" },
  { href: "/cotizador", label: "Cotizador" },
];

export function CsFooter() {
  const { openTalk } = useConsola();
  const time = useClock(true);
  const year = new Date().getFullYear();

  return (
    <CsSection id="contacto" label="Contacto" className="pt-28 md:pt-40">
      {/* El cierre: la propuesta, los tres caminos para escribirnos y la marca en 3D abajo, como firma. */}
      <div className="relative overflow-hidden rounded-(--cs-radius) border border-(--paper)/[0.07] bg-[radial-gradient(90%_70%_at_50%_100%,rgb(255_77_46/0.16),transparent_70%),#0d0d0f] px-5 pt-14 md:px-10 md:pt-20">
        <div className="flex flex-col items-center text-center">
          <p className="rd-label text-(--paper)/60">( {SITE.availability.slots} lugares este mes )</p>
          <RdLines
            className="cs-cond mt-4 text-[clamp(2.6rem,5.6vw,5.6rem)] text-(--paper)"
            lines={[
              <span key="a">Tu negocio,</span>,
              <span key="b">
                el <span className="rd-serif text-(--signal)">próximo</span> caso
              </span>,
            ]}
          />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={openTalk}
              className="rd-body inline-flex h-14 items-center rounded-full bg-(--signal) px-7 text-[16px] font-medium text-(--ink) shadow-[0_12px_30px_-10px_rgb(255_77_46/0.7)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-(--paper)"
            >
              Contanos tu idea
            </button>
            <WhatsAppButton big />
            <MailButton big />
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-[1100px] md:mt-16">
          <MarcaSe7en />
        </div>
      </div>

      <div className="mt-14 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="cs-cond text-[clamp(2.4rem,4.4vw,4rem)]">
            Hecho a mano
            <br />
            en la <span className="rd-serif text-(--signal)">Patagonia</span>.
          </p>
          <div className="mt-6">
            <Socials />
          </div>
        </div>
        <div className="md:col-span-3">
          <p className="rd-label text-[10px] text-(--paper)/45">Contacto</p>
          <a href={`mailto:${SITE.email}`} className="rd-body rd-link mt-1 inline-flex min-h-10 items-center text-[1.05rem] break-all text-(--paper)">
            {SITE.email}
          </a>
          <p className="rd-body mt-4 text-[1.05rem] leading-snug text-(--paper)/80">
            Catriel, Río Negro
            <br />
            Argentina
          </p>
          <p className="rd-label mt-6 text-[10px] text-(--paper)/45">Hora local</p>
          <p className="cs-cond mt-2 text-[2.2rem] tabular-nums">{time ?? "--:--:--"}</p>
        </div>
        <div className="md:col-span-4">
          <p className="rd-label text-[10px] text-(--paper)/45">Mapa</p>
          <ul className="rd-body mt-2 grid grid-cols-2 gap-x-6 text-[1.1rem]">
            {MAP.map((l) => (
              <li key={l.href}>
                {/* Alto de 40 px: se tocan con el dedo. */}
                <Link href={l.href} className="rd-link inline-flex min-h-10 items-center">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-14 mb-6 flex flex-wrap items-center justify-between gap-4 border-t border-(--paper)/10 pt-5">
        <span className="rd-label text-[10px] text-(--paper)/45">
          © {year} {SITE.name}
        </span>
        <a href="#top" className="rd-label rd-link text-[10px] text-(--paper)/60">
          Volver arriba ↑
        </a>
      </div>
    </CsSection>
  );
}
