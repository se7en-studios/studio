import type { Metadata } from "next";
import { LazyMotion, domAnimation } from "framer-motion";
import "../(landing)/rd.css";
import "./consola.css";
import { wide, serif } from "@/lib/rd-fonts";
import { MotionProvider } from "@/components/providers/motion-provider";

// Propuesta de rediseño «Consola» (inspirada en la estructura de paisanos.io):
// vive en su propia ruta para compararla con la home sin tocarla. No se indexa.
export const metadata: Metadata = {
  title: { absolute: "Se7en Studio — Consola (propuesta de rediseño)" },
  robots: { index: false, follow: false },
};

export default function ConsolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className={`rd cs ${wide.variable} ${serif.variable}`}>
      <a
        href="#main"
        className="sr-only rounded bg-(--signal) px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
      >
        Saltar al contenido
      </a>
      <MotionProvider>
        <LazyMotion features={domAnimation}>{children}</LazyMotion>
      </MotionProvider>
    </div>
  );
}
