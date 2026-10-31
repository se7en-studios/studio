"use client";

import { useSoundFx } from "@/lib/use-sound-fx";
import { Volume2, VolumeX } from "lucide-react";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className = "" }: SoundToggleProps) {
  const { enabled, toggle } = useSoundFx();

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Desactivar efectos de sonido táctiles" : "Activar efectos de sonido táctiles"}
      aria-label={enabled ? "Desactivar sonido" : "Activar sonido"}
      className={`group relative flex items-center gap-1.5 rounded-full border border-(--line) bg-(--ink)/60 px-2.5 py-1.5 text-[11px] font-mono tracking-wider backdrop-blur-md transition-all hover:border-(--signal) hover:bg-white/5 ${
        enabled ? "text-(--signal)" : "text-(--paper)/50"
      } ${className}`}
    >
      {enabled ? (
        <>
          <Volume2 className="h-3.5 w-3.5 animate-pulse" />
          <span className="hidden sm:inline">AUDIO ON</span>
        </>
      ) : (
        <>
          <VolumeX className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AUDIO OFF</span>
        </>
      )}
    </button>
  );
}

