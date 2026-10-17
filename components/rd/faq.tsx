"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { SITE } from "@/data/site";
import { landingFaqs as faqs } from "@/data/faq";
import {
  EASE_OUT,
  RdButton,
  RdLabel,
  RdLines,
} from "@/components/rd/primitives";

export function RdFaq() {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <section
      id="faq"
      data-theme="ink"
      className="relative bg-(--ink) pb-24 md:pb-36"
    >
      <div className="rd-wrap grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <RdLabel index="08" className="text-(--paper)/60">
              Preguntas
            </RdLabel>
            <RdLines
              lines={[
                "Lo que",
                <>
                  <span className="rd-serif text-(--signal)">siempre</span>
                  {" nos"}
                </>,
                "preguntan",
              ]}
              className="rd-display mt-8 text-[clamp(2.2rem,4.4vw,5.2rem)]"
            />
            <div className="mt-10">
              <RdButton href={SITE.whatsapp} external variant="ghost">
                ¿Otra duda? Escribinos
              </RdButton>
            </div>
          </div>
        </div>

        <ul className="border-t border-(--line) lg:col-span-7">
          {faqs.map((item, i) => {
            const open = openId === item.id;
            return (
              <li key={item.id} className="border-b border-(--line)">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`rd-faq-${item.id}`}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="group flex w-full items-center gap-6 py-6 text-left md:py-8"
                  >
                    <span className="rd-label w-8 shrink-0 text-(--paper)/40">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="rd-body flex-1 text-xl leading-tight font-semibold tracking-[-0.02em] transition-colors duration-300 group-hover:text-(--signal) md:text-[1.7rem]">
                      {item.question}
                    </span>
                    <span
                      aria-hidden
                      className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-all duration-500 ease-(--ease-out) ${
                        open
                          ? "rotate-45 border-(--signal) bg-(--signal) text-(--ink)"
                          : "border-(--line) text-(--paper)"
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 1v14M1 8h14" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {open && (
                    <m.div
                      id={`rd-faq-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE_OUT }}
                      className="overflow-hidden"
                    >
                      <p className="rd-body max-w-2xl pb-8 pl-14 text-base leading-relaxed text-(--paper)/70 md:text-lg">
                        {item.answer}
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
