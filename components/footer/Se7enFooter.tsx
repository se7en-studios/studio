"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildSVG, bindScene } from "./scene";
import { Lock } from "lucide-react";
import { SITE } from "@/data/site";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

/**
 * Footer cinemático de Se7en Studio — "Construimos el puente".
 * Next.js 14 + Tailwind, sin dependencias. Va al final del layout: <Se7enFooter />
 * Fuentes: usa --font-archivo / --font-chivo-mono (next/font) si están definidas.
 */

// Dos columnas cortas con lo que más se busca; el resto va en chico en la
// barra de abajo, que termina con el acceso al panel del equipo.
const ESTUDIO = [
  ["Trabajos", "/work"],
  ["Servicios", "/services"],
  ["Precios", "/pricing"],
  ["Sobre nosotros", "/#about"],
  ["Blog", "/blog"],
] as const;
const RECURSOS = [
  ["Diagnóstico gratuito", "/audit"],
  ["Calculadora de retorno", "/roi"],
  ["Demos interactivas", "/playground"],
  ["Testimonios", "/testimonials"],
] as const;
const LEGALES = [
  ["Tecnología", "/tech"],
  ["Portal de inicio", "/kickoff"],
] as const;

const mono =
  "font-mono [font-family:var(--font-chivo-mono),ui-monospace,monospace]";
const reveal =
  "opacity-0 motion-reduce:!opacity-100 motion-reduce:!transform-none";

function Clock() {
  const [now, setNow] = useState("--:--:--");
  useEffect(() => {
    const f = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const t = () => setNow(f.format(new Date()));
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  return <b className="font-medium text-[#f5f5f4]">{now}</b>;
}

function StatusTag() {
  return (
    <span
      className={`${mono} inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-[#17171a]/70 px-3 py-1.5 text-xs text-[#f5f5f4] md:backdrop-blur`}
    >
      <i className="h-[7px] w-[7px] rounded-full bg-[#ff4d2e] shadow-[0_0_10px_#ff4d2e]" />
      Estudio Abierto <span className="text-[#8a8a8e]">· Patagonia AR</span>
    </span>
  );
}

// El panel del equipo tiene su propia UI: sin footer. Se monta aparte para que
// el efecto de la escena corra de cero al volver al sitio público.
export default function Se7enFooter() {
  return usePathname()?.startsWith("/admin") ? null : <Footer />;
}

function Footer() {
  const root = useRef<HTMLElement>(null);
  const svg = useMemo(() => buildSVG(), []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // En mobile el contenedor de la escena es mucho más angosto que alto:
    // con la amplitud de paneo pensada para desktop (14vh), el slice de
    // aspect-ratio del SVG termina mostrando sólo una tira angosta y
    // centrada del puente. Una amplitud menor + contenedor más bajo (ver
    // clases del div [data-art] más abajo) muestra una porción más ancha
    // de la escena a costa de un paneo vertical más sutil.
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const ampVh = isMobile ? 5 : 14;
    const apply = bindScene(el, ampVh);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(1);
      return;
    }

    // En mobile el footer no se pinea (fluye normal): el progreso se mide
    // sobre la altura de la escena, así el puente termina de armarse cuando
    // entra entera y los links de abajo ya están revelados al llegar a ellos.
    const art = el.querySelector<HTMLElement>("[data-art]");
    const span = () => (isMobile && art ? art.offsetHeight : el.offsetHeight);
    const target = () => {
      const r = el.getBoundingClientRect();
      return Math.max(0, Math.min(1, (window.innerHeight - r.top) / span()));
    };
    // El SVG tiene ~900 nodos: re-escribirlo cada frame en reposo es lo que
    // laguea. El rAF corre sólo mientras hay movimiento (scroll/resize) y se
    // apaga solo cuando la inercia llega al target.
    let cur = target(),
      raf = 0;
    const tick = () => {
      const t = target();
      cur += (t - cur) * 0.12; // inercia
      const done = Math.abs(t - cur) < 1e-3;
      if (done) cur = t;
      apply(cur);
      raf = done ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    apply(cur);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          window.addEventListener("scroll", kick, { passive: true });
          window.addEventListener("resize", kick);
          kick();
        } else {
          window.removeEventListener("scroll", kick);
          window.removeEventListener("resize", kick);
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <footer
      ref={root}
      className="relative bg-[#0a0a0b] text-[#f5f5f4] antialiased md:h-[240vh]"
    >
      <div className="relative overflow-hidden [isolation:isolate] md:sticky md:top-0 md:h-screen">
        {/* escena */}
        <div
          data-art
          className="relative -mt-[5vh] h-[60vh] will-change-transform [container-type:size] md:absolute md:inset-x-0 md:mt-0 [&_svg]:absolute [&_svg]:inset-0 [&_svg]:h-full [&_svg]:w-full md:-top-[14vh] md:h-[114vh]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        {/* barra superior */}
        <div className="absolute inset-x-4 top-[88px] z-10 flex items-center justify-between md:inset-x-10 md:top-[96px]">
          <div data-reveal=".62" className={reveal}>
            <StatusTag />
          </div>
          <span
            data-reveal=".64"
            className={`${reveal} ${mono} hidden text-xs tracking-[.06em] text-[#8a8a8e] md:inline`}
          >
            ART (GMT-3) · <Clock />
          </span>
        </div>

        {/* panel de links */}
        <div className="relative z-10 -mt-24 bg-[linear-gradient(to_top,#0a0a0b_88%,rgba(10,10,11,.9)_94%,transparent)] px-4 pb-24 pt-20 md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:bg-[linear-gradient(to_top,#0a0a0b_62%,rgba(10,10,11,.85)_80%,transparent)] md:px-10 md:pb-[22px] md:pt-[120px]">
          <div className="mx-auto grid max-w-[1360px] grid-cols-2 gap-6 md:grid-cols-[1.4fr_1fr_1fr_1.1fr] md:gap-10">
            <div
              data-reveal=".86"
              className={`${reveal} col-span-2 md:col-span-1`}
            >
              <h4
                className={`${mono} mb-4 text-[11px] font-medium tracking-[.14em] text-[#8a8a8e]`}
              >
                SE7EN STUDIO
              </h4>
              <p className="hidden max-w-[320px] text-sm leading-relaxed text-[#8a8a8e] md:block">
                Estudio boutique de software y diseño en Argentina. Construimos
                plataformas, tiendas online y sitios web que cargan al instante.
              </p>
              <div className="mt-[18px] grid gap-2.5 text-sm">
                <a
                  href={`mailto:${SITE.email}`}
                  className="w-fit transition-colors hover:text-[#ff4d2e]"
                >
                  {SITE.email}
                </a>
                <a
                  href={SITE.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 text-[#25D366] transition-opacity hover:opacity-80"
                >
                  <WhatsAppLogo size={15} /> WhatsApp
                </a>
              </div>
            </div>

            {(
              [
                ["ESTUDIO", ESTUDIO, ".88"],
                ["RECURSOS", RECURSOS, ".9"],
              ] as const
            ).map(([title, links, at]) => (
              <nav
                key={title}
                data-reveal={at}
                className={reveal}
                aria-label={title}
              >
                <h4
                  className={`${mono} mb-4 text-[11px] font-medium tracking-[.14em] text-[#8a8a8e]`}
                >
                  {title}
                </h4>
                <ul className="grid gap-2.5 text-sm">
                  {links.map(([label, href]) => (
                    <li key={href}>
                      <a
                        href={href}
                        className="text-[#d6d6d4] transition-colors hover:text-[#ff4d2e]"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                  {title === "RECURSOS" && (
                    <>
                      <li>
                        <button
                          type="button"
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("open-booking-modal"),
                            )
                          }
                          className="text-left text-[#d6d6d4] transition-colors hover:text-[#ff4d2e]"
                        >
                          Agendar una llamada
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
            ))}

            <div
              data-reveal=".92"
              className={`${reveal} col-span-2 rounded-[18px] border border-white/[.08] bg-[#17171a]/60 p-[22px] md:backdrop-blur-md md:col-span-1`}
            >
              <h4
                className={`${mono} mb-4 text-[11px] font-medium tracking-[.14em] text-[#8a8a8e]`}
              >
                PRÓXIMO PASO
              </h4>
              <strong className="mb-4 block text-[22px] font-semibold leading-[1.15] tracking-[-.02em]">
                Cruzá al otro lado. Tu proyecto, en vivo en 3 semanas.
              </strong>
              <Link
                href="/start"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#ff4d2e] px-[22px] py-3.5 text-[15px] font-medium text-white transition hover:brightness-110"
              >
                Iniciar un proyecto →
              </Link>
            </div>
          </div>

          <div
            data-reveal=".94"
            className={`${reveal} ${mono} mx-auto mt-[30px] flex max-w-[1360px] flex-col gap-3 border-t md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 border-white/[.08] pt-4 text-xs text-[#8a8a8e]`}
          >
            <span>
              © {new Date().getFullYear()} {SITE.name}
            </span>
            <nav aria-label="Más" className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGALES.map(([label, href]) => (
                <Link key={href} href={href} className="transition-colors hover:text-[#f5f5f4]">
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="transition-colors hover:text-[#f5f5f4]"
              >
                Volver arriba ↑
              </button>
              {/* Lo último de todo: el acceso al panel del equipo. */}
              <Link
                href="/admin"
                rel="nofollow"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] px-3 py-1.5 transition-colors hover:border-white/20 hover:text-[#f5f5f4]"
              >
                <Lock size={11} /> Panel del equipo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
