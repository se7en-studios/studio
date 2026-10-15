"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { projects } from "@/data/projects";
import { team } from "@/data/team";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { MD, useMediaQuery } from "@/lib/use-media-query";
import { RdLabel } from "@/components/rd/primitives";

type Token =
  | { kind: "word"; text: string; accent: boolean }
  | { kind: "faces" }
  | { kind: "clip"; slug: string };

const words = (text: string, accent = false): Token[] =>
  text.split(" ").map((t) => ({ kind: "word", text: t, accent }));

const TOKENS: Token[] = [
  ...words("Somos"),
  { kind: "faces" },
  ...words(
    "Franco y Federico: dos fundadores que diseñan y programan cada proyecto de punta a punta.",
  ),
  ...words("Sin intermediarios, sin plantillas, sin vueltas.", true),
  { kind: "clip", slug: "pone-la-pava" },
  ...words("Sitios y apps rápidos, a tu nombre, que hacen crecer tu negocio."),
];

export function RdManifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "end 45%"],
  });

  return (
    <section
      id="estudio"
      data-theme="ink"
      className="relative bg-(--ink) pt-12 pb-28 md:pt-20 md:pb-40"
    >
      <div className="rd-wrap grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <RdLabel index="01" className="text-(--paper)/60">
            El estudio
          </RdLabel>
        </div>
        <p
          ref={ref}
          className="rd-body text-[clamp(1.75rem,4.1vw,4.4rem)] leading-[1.08] font-medium tracking-[-0.03em] lg:col-span-9"
        >
          {TOKENS.map((token, i) => (
            <ManifestoToken
              key={i}
              token={token}
              progress={scrollYProgress}
              range={[i / TOKENS.length, (i + 1) / TOKENS.length]}
              still={reduced}
            />
          ))}
        </p>
      </div>
    </section>
  );
}

/** Cada token se enciende cuando el scroll pasa por su tramo del párrafo. */
function ManifestoToken({
  token,
  progress,
  range,
  still,
}: {
  token: Token;
  progress: MotionValue<number>;
  range: [number, number];
  still: boolean;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const scale = useTransform(progress, range, [0.6, 1]);
  const wide = useMediaQuery(MD);

  if (token.kind === "word") {
    return (
      <>
        <motion.span
          style={still ? undefined : { opacity }}
          className={
            token.accent ? "rd-serif text-[1.12em] text-(--signal)" : undefined
          }
        >
          {token.text}
        </motion.span>{" "}
      </>
    );
  }

  if (token.kind === "faces") {
    return (
      <>
        <motion.span
          aria-hidden
          style={still ? undefined : { scale }}
          className="inline-flex translate-y-[0.12em] align-baseline"
        >
          {team.map((m, i) =>
            m.imageUrl ? (
              <span
                key={m.id}
                className={`relative inline-block h-[0.9em] w-[0.9em] overflow-hidden rounded-full ring-[3px] ring-(--ink) ${i > 0 ? "-ml-[0.22em]" : ""}`}
              >
                <Image
                  src={m.imageUrl}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </span>
            ) : null,
          )}
        </motion.span>{" "}
      </>
    );
  }

  const project = projects.find((p) => p.slug === token.slug);
  if (!project?.video) return null;
  return (
    <>
      <motion.span
        aria-hidden
        style={still ? undefined : { scale }}
        className="relative inline-block h-[0.86em] w-[1.9em] translate-y-[0.1em] overflow-hidden rounded-full align-baseline"
      >
        <Image
          src={project.image}
          alt=""
          fill
          sizes="160px"
          className="object-cover object-top"
        />
        {wide && !still && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={project.video.webm} type="video/webm" />
            <source src={project.video.mp4} type="video/mp4" />
          </video>
        )}
      </motion.span>{" "}
    </>
  );
}
