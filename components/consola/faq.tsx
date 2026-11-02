"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { landingFaqs } from "@/data/faq";
import { RdLines } from "@/components/rd/primitives";
import { CsSection } from "@/components/consola/section";

// Preguntas frecuentes: las mismas de la home anterior (y del JSON-LD del
// layout, que tiene que coincidir con lo que se ve). Una abierta por vez.

export function CsFaq() {
  const [open, setOpen] = useState<string | null>(landingFaqs[0]?.id ?? null);
  return (
    <CsSection id="faq" label="Preguntas frecuentes" className="pt-28 md:pt-40">
      <RdLines
        className="cs-h2 text-[clamp(2.4rem,4.6vw,4.4rem)]"
        lines={[
          <span key="faq">
            Lo que nos <span className="rd-serif text-(--signal)">preguntan</span>
          </span>,
        ]}
      />
      <ul className="mt-10 flex flex-col gap-2 md:mt-14">
        {landingFaqs.map((f) => {
          const on = open === f.id;
          return (
            <li key={f.id} className="cs-card overflow-hidden">
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`faq-${f.id}`}
                  onClick={() => setOpen(on ? null : f.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6 md:py-5"
                >
                  <span className="rd-body text-[1.02rem] leading-snug text-(--paper) md:text-[1.12rem]">{f.question}</span>
                  <span
                    aria-hidden
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color] duration-300 ${
                      on ? "rotate-45 border-(--signal) bg-(--signal) text-(--ink)" : "border-(--paper)/20 text-(--paper)/70"
                    }`}
                  >
                    <Plus size={16} />
                  </span>
                </button>
              </h3>
              <div
                id={`faq-${f.id}`}
                className={`grid transition-[grid-template-rows] duration-400 ease-(--ease-out) ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <p className="rd-body overflow-hidden px-5 text-[15px] leading-relaxed text-(--paper)/70 md:px-6">
                  <span className="block max-w-[68ch] pb-5">{f.answer}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </CsSection>
  );
}
