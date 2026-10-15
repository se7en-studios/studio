"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { team } from "@/data/team";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import {
  RdButton,
  RdLabel,
  RdLines,
  RdReveal,
} from "@/components/rd/primitives";

export function RdTeam() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Cada retrato se mueve a distinta velocidad para que no vayan en bloque.
  const y0 = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const y1 = useTransform(scrollYProgress, [0, 1], ["16%", "-10%"]);

  return (
    <section
      id="equipo"
      data-theme="paper"
      className="relative -mt-10 overflow-hidden rounded-t-[2.5rem] bg-(--paper) py-24 text-(--ink) md:-mt-16 md:rounded-t-[4rem] md:py-36"
    >
      <div className="rd-wrap">
        <div className="grid gap-8 lg:grid-cols-12">
          <RdLabel index="06" className="text-(--ink)/60 lg:col-span-3">
            Fundadores
          </RdLabel>
          <div className="lg:col-span-9">
            <RdLines
              lines={[
                "Dos fundadores.",
                <>
                  <span className="rd-serif text-(--signal)">Cero</span>
                  {" intermediarios."}
                </>,
              ]}
              className="rd-display text-[clamp(2.2rem,5.6vw,6.8rem)]"
            />
            <RdReveal className="mt-8 flex flex-wrap items-center gap-6">
              <p className="rd-body max-w-lg text-lg leading-snug text-(--ink)/70 md:text-xl">
                Hablás directo con quien diseña y con quien programa tu
                proyecto. Sin ejecutivos de cuenta, sin teléfono descompuesto.
              </p>
              <RdButton href="#contacto" variant="ink">
                Hablá con los dos
              </RdButton>
            </RdReveal>
          </div>
        </div>

        <div
          ref={ref}
          className="mt-16 grid gap-6 md:mt-24 md:grid-cols-2 md:gap-8"
        >
          {team.map((member, i) => (
            <motion.article
              key={member.id}
              style={reduced ? undefined : { y: i === 0 ? y0 : y1 }}
              className="group"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-(--paper-2)">
                {member.imageUrl && (
                  <Image
                    src={member.imageUrl}
                    alt={member.name ?? ""}
                    fill
                    sizes="(min-width: 768px) 46vw, 100vw"
                    className="object-cover grayscale transition-[filter,transform] duration-[1.2s] ease-(--ease-out) group-hover:scale-[1.04] group-hover:grayscale-0"
                  />
                )}
                <span className="rd-label absolute top-5 left-5 rounded-full bg-(--paper) px-3 py-1.5 text-[10px] font-bold text-(--ink)">
                  {member.role}
                </span>
                <div className="absolute inset-x-5 bottom-5 flex flex-wrap gap-1.5">
                  {member.focus?.map((f) => (
                    <span
                      key={f}
                      className="rd-label rounded-full bg-(--ink)/70 px-2.5 py-1 text-[10px] text-(--paper) backdrop-blur-md"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex items-start justify-between gap-6">
                <div>
                  <h3 className="rd-display text-[clamp(1.8rem,3.2vw,3.2rem)]">
                    {member.name}
                  </h3>
                  <p className="rd-body mt-3 max-w-md text-base leading-snug text-(--ink)/70">
                    {member.bio}
                  </p>
                </div>
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`LinkedIn de ${member.name}`}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-(--ink)/20 transition-colors duration-300 hover:border-(--ink) hover:bg-(--ink) hover:text-(--paper)"
                  >
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
