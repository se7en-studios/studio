"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { InstagramIcon, LinkedinIcon } from "@/components/ui/brand-icons";
import { SITE } from "@/data/site";
import { CsSection, useConsola } from "@/components/consola/section";
import { useClock } from "@/components/consola/shell";

// Contacto y pie: al llegar acá el panel se vuelve el formulario. Abajo, el
// SE7EN gigante con grano de tinta y sombra de trama.

const MAP = [
  { href: "#inicio", label: "Inicio" },
  { href: "#trabajos", label: "Trabajos" },
  { href: "#piezas", label: "Piezas" },
  { href: "#notas", label: "Notas" },
  { href: "#equipo", label: "Equipo" },
  { href: "/cotizador", label: "Cotizador" },
];

export function CsFooter() {
  const { openTalk } = useConsola();
  const time = useClock(true);
  const year = new Date().getFullYear();
  const socials = [
    SITE.social.linkedin && { href: SITE.social.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
    SITE.social.instagram && { href: SITE.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: SITE.whatsapp, label: "WhatsApp", Icon: MessageCircle },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof LinkedinIcon }[];

  return (
    <CsSection id="contacto" label="Contacto" className="pt-28 md:pt-40">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <p className="cs-cond text-[clamp(3rem,6vw,5.6rem)]">
            Hecho a mano
            <br />
            en la <span className="rd-serif text-(--signal)">Patagonia</span>.
          </p>
          <div className="mt-8 flex gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid h-14 w-14 place-items-center rounded-full border border-(--paper)/15 text-(--paper) transition-colors hover:border-(--signal) hover:bg-(--signal) hover:text-(--ink)"
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
          <p className="rd-label mt-10 text-[10px] text-(--paper)/45">Contacto</p>
          <a href={`mailto:${SITE.email}`} className="rd-body rd-link mt-2 inline-block text-[1.3rem] text-(--paper)">
            {SITE.email}
          </a>
          <button
            type="button"
            onClick={openTalk}
            className="rd-body mt-6 block text-[15px] text-(--signal) lg:hidden"
          >
            Abrir el formulario →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="rd-label text-[10px] text-(--paper)/45">Mapa</p>
            <ul className="rd-body mt-4 flex flex-col gap-2 text-[1.15rem]">
              {MAP.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="rd-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="rd-label text-[10px] text-(--paper)/45">Estudio</p>
            <p className="rd-body mt-4 text-[1.05rem] leading-snug text-(--paper)/85">
              Catriel, Río Negro
              <br />
              Argentina
            </p>
            <p className="rd-label mt-6 text-[10px] text-(--paper)/45">Hora local</p>
            <p className="cs-cond mt-2 text-[2.2rem] tabular-nums">{time ?? "--:--:--"}</p>
          </div>
        </div>
      </div>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-(--paper)/10 py-5">
        <span className="rd-label text-[10px] text-(--paper)/45">
          © {year} {SITE.name}
        </span>
        <a href="#top" className="rd-label rd-link text-[10px] text-(--paper)/60">
          Volver arriba ↑
        </a>
      </div>

      <div aria-hidden className="cs-riso mt-2 mb-4 select-none">
        <p className="rd-display cs-riso__shadow text-center">SE7EN</p>
        <p className="rd-display cs-riso__ink text-center">
          SE<span className="cs-riso__seven">7</span>EN
        </p>
      </div>
    </CsSection>
  );
}
