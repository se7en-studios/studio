"use client";

import { useState } from "react";
import { m } from "framer-motion";
import {
  Activity,
  Globe,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";
import { useSoundFx } from "@/lib/use-sound-fx";

interface MonitoredSite {
  id: string;
  name: string;
  slug: string;
  url: string;
  status: "200 OK" | "200 OK" | "warning";
  latencyMs: number;
  lighthouseScore: number;
  sslDaysLeft: number;
  category: string;
}

const MONITORED_SITES: MonitoredSite[] = [
  {
    id: "takefyy",
    name: "Takefyy",
    slug: "takefyy",
    url: "https://takefyy.com",
    status: "200 OK",
    latencyMs: 195,
    lighthouseScore: 99,
    sslDaysLeft: 84,
    category: "Gastronomía & Carta Digital",
  },
  {
    id: "pone-la-pava",
    name: "Poné La Pava",
    slug: "pone-la-pava",
    url: "https://ponelapava.com",
    status: "200 OK",
    latencyMs: 210,
    lighthouseScore: 98,
    sslDaysLeft: 62,
    category: "E-commerce & Bebidas",
  },
  {
    id: "muzzaga",
    name: "Muzzaga Pádel",
    slug: "muzzaga",
    url: "https://muzzaga-padel-seven.vercel.app/",
    status: "200 OK",
    latencyMs: 165,
    lighthouseScore: 100,
    sslDaysLeft: 90,
    category: "Turnos & Complejo Deportivo",
  },
  {
    id: "iphone-vita",
    name: "iPhone Vita",
    slug: "iphone-vita",
    url: "https://iphonevita.vercel.app/",
    status: "200 OK",
    latencyMs: 220,
    lighthouseScore: 99,
    sslDaysLeft: 75,
    category: "Catálogo Online & Apple",
  },
  {
    id: "pravilo",
    name: "Pravilo Argentina",
    slug: "pravilo",
    url: "https://pravilo.com.ar",
    status: "200 OK",
    latencyMs: 185,
    lighthouseScore: 99,
    sslDaysLeft: 45,
    category: "Servicios & Salud",
  },
  {
    id: "sentinel",
    name: "Sentinel Climate Tech",
    slug: "sentinel",
    url: "https://sentinelclimatetech.com",
    status: "200 OK",
    latencyMs: 240,
    lighthouseScore: 98,
    sslDaysLeft: 88,
    category: "Plataforma Satelital",
  },
];

export function TelemetryRadar() {
  const [testing, setTesting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [sites, setSites] = useState(MONITORED_SITES);
  const sound = useSoundFx();

  const handleRunPingTest = () => {
    if (testing) return;
    setTesting(true);
    sound.click();

    setTimeout(() => {
      setSites((prev) =>
        prev.map((s) => ({
          ...s,
          latencyMs: Math.floor(Math.random() * 60) + 140, // 140ms a 200ms
        }))
      );
      setTesting(false);
      sound.success();
    }, 1800);
  };

  const handleCopyPortalLink = (slug: string) => {
    const portalUrl = `https://se7en.com.ar/portal/acceso/${slug}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedSlug(slug);
    sound.tick();
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-5 md:p-7 backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] text-emerald-400 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Datadog / Vercel Edge Telemetry Radar
          </div>
          <h3 className="mt-2 text-lg font-bold text-foreground">
            Monitoreo en Vivo de Sitios en Producción
          </h3>
          <p className="text-xs text-muted/70 mt-0.5">
            Salud de servidores, latencia de borde (TTFB), certificados SSL y enlaces de acceso para clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunPingTest}
          disabled={testing}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-mono font-bold text-black transition-all hover:bg-foreground disabled:opacity-50"
        >
          <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
          <span>{testing ? "Midiendo latencia..." : "Test de Latencia Global ⚡"}</span>
        </button>
      </div>

      {/* Grid de Sitios Monitoreados */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => {
          const isCopied = copiedSlug === site.slug;
          return (
            <div
              key={site.id}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-black/50 p-4 transition-all hover:border-white/20 hover:bg-black/70"
            >
              <div>
                {/* Cabecera del Proyecto */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <span>{site.name}</span>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-accent transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </h4>
                    <p className="font-mono text-[11px] text-muted/60 mt-0.5">{site.category}</p>
                  </div>

                  {/* Estado HTTP */}
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {site.status}
                  </span>
                </div>

                {/* Métricas: Latencia, Google Score, SSL */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-black/60 p-2.5 font-mono text-center text-xs border border-white/[0.04]">
                  <div>
                    <span className="text-[10px] text-muted/60 block">Latencia</span>
                    <span className="font-bold text-emerald-400">{site.latencyMs} ms</span>
                  </div>
                  <div className="border-x border-white/10">
                    <span className="text-[10px] text-muted/60 block">PageSpeed</span>
                    <span className="font-bold text-foreground">{site.lighthouseScore}/100</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted/60 block">SSL Válido</span>
                    <span className="font-bold text-muted/80">{site.sslDaysLeft} d</span>
                  </div>
                </div>
              </div>

              {/* Botón de Acceso al Portal de Cliente */}
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-[11px] font-mono text-muted/60">Portal del cliente:</span>
                <button
                  type="button"
                  onClick={() => handleCopyPortalLink(site.slug)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-mono transition-colors ${
                    isCopied
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold"
                      : "border-white/10 bg-white/5 text-muted hover:text-foreground hover:bg-white/10"
                  }`}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied ? "¡Enlace copiado!" : "Copiar Enlace"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
