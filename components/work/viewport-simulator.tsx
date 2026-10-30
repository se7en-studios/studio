"use client";

import { useState } from "react";
import Image from "next/image";
import { Laptop, Smartphone, Tablet, ExternalLink } from "lucide-react";
import { useSoundFx } from "@/components/providers/sound-provider";
import { PhoneScreen } from "@/components/work/phone-screen";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { Project } from "@/types";

type Device = "desktop" | "tablet" | "mobile";

interface ViewportSimulatorProps {
  imageSrc: string;
  projectName: string;
  videoSrc?: Project["video"];
  screens?: Project["screens"];
  screenVideos?: Project["screenVideos"];
  liveUrl?: string;
}

const DEVICES: { id: Device; label: string; Icon: typeof Laptop }[] = [
  { id: "desktop", label: "Desktop", Icon: Laptop },
  { id: "tablet", label: "Tablet", Icon: Tablet },
  { id: "mobile", label: "Mobile", Icon: Smartphone },
];

function hostOf(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function ViewportSimulator({
  imageSrc,
  projectName,
  videoSrc,
  screens,
  screenVideos,
  liveUrl,
}: ViewportSimulatorProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const { playClick } = useSoundFx();
  const reduced = useReducedMotion();
  const host = hostOf(liveUrl);

  // Tablet y celular muestran la captura real de ese tamaño. Sin captura,
  // recortan la de escritorio (el comportamiento anterior).
  const screen = device === "desktop" ? null : screens?.[device];
  // Y si hay recorrido en video de ese tamaño, corre encima de la captura: la
  // captura queda de fondo mientras carga y con movimiento reducido.
  const clip = device === "desktop" || reduced ? undefined : screenVideos?.[device];
  const clipVideo = clip && (
    <video
      key={clip.mp4}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 h-full w-full object-cover object-top"
    >
      <source src={clip.webm} type="video/webm" />
      <source src={clip.mp4} type="video/mp4" />
    </video>
  );

  return (
    <div className="mt-12 rounded-3xl border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <span className="font-mono text-xs text-accent uppercase font-semibold">
            Simulador de Dispositivos Responsive
          </span>
          <h3 className="font-semibold text-foreground text-lg mt-1">
            Inspeccionar en múltiples pantallas
          </h3>
        </div>

        <div
          role="group"
          aria-label="Tamaño de pantalla"
          className="flex rounded-xl border border-border bg-background p-1 font-mono text-xs"
        >
          {DEVICES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              onClick={() => {
                playClick();
                setDevice(id);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                device === id
                  ? "bg-accent text-background font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center py-6 px-4 bg-background/50 rounded-2xl border border-border/60 overflow-hidden min-h-[420px] items-center">
        {device === "desktop" && (
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border/80 bg-black shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#1a1a1f] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              </div>
              <span className="truncate font-mono text-[11px] text-white/50">
                {host}
              </span>
              <div className="w-12" />
            </div>

            <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface">
              {videoSrc ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                >
                  <source src={videoSrc.webm} type="video/webm" />
                  <source src={videoSrc.mp4} type="video/mp4" />
                </video>
              ) : (
                <Image
                  src={imageSrc}
                  alt={projectName}
                  fill
                  sizes="(max-width: 1024px) 100vw, 900px"
                  className="object-cover object-top"
                />
              )}
            </div>
          </div>
        )}

        {device === "tablet" && (
          <div className="w-full max-w-[360px] overflow-hidden rounded-[28px] border-[10px] border-[#2c2c34] bg-black shadow-2xl">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface">
              <Image
                src={screen ?? imageSrc}
                alt={`${projectName} en tablet`}
                fill
                sizes="360px"
                className="object-cover object-top"
              />
              {clipVideo}
            </div>
          </div>
        )}

        {device === "mobile" && (
          <div className="w-full max-w-[280px] overflow-hidden rounded-[40px] border-[8px] border-[#2c2c34] bg-black shadow-2xl">
            <PhoneScreen src={screen ?? imageSrc} alt={`${projectName} en celular`} sizes="280px">
              {clipVideo}
            </PhoneScreen>
          </div>
        )}
      </div>

      {liveUrl && host && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-foreground"
        >
          Probarlo en vivo en {host}
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
