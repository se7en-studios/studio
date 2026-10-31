"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import { MessageCircle, Calculator } from "lucide-react";
import { SITE } from "@/data/site";
import { EASE_OUT } from "@/components/rd/primitives";

export function RdMobileStickyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      // Aparece luego de pasar el hero (400px) y se oculta al llegar al final (contacto/footer)
      const pastHero = scrollY > 400;
      const nearBottom = scrollY + winHeight > docHeight - 650;
      setVisible(pastHero && !nearBottom);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const whatsappUrl = `https://wa.me/5492994247985?text=${encodeURIComponent(
    "Hola Franco y Fede! Les escribo desde la web de Se7en para consultar por una página para mi negocio."
  )}`;

  return (
    <AnimatePresence>
      {visible && (
        <m.aside
          aria-label="Acciones rápidas"
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/[0.12] bg-[#0b0b0c]/90 px-3.5 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl md:hidden"
        >
          {/* Botón Cotizador */}
          <Link
            href="/cotizador"
            className="flex items-center gap-2 rounded-full bg-(--signal) px-4 py-2 text-xs font-semibold text-(--ink) shadow-[0_0_15px_rgba(255,77,46,0.35)] transition-transform active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="rd-ping absolute inset-0 rounded-full bg-(--ink)/60" />
              <span className="relative h-2 w-2 rounded-full bg-(--ink)" />
            </span>
            <span>Cotizá en 1 min ↗</span>
          </Link>

          {/* Botón WhatsApp Directo */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escribir por WhatsApp"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 transition-transform active:scale-95"
          >
            <MessageCircle size={18} />
          </a>
        </m.aside>
      )}
    </AnimatePresence>
  );
}
