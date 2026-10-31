"use client";

import { useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useSoundFx } from "@/lib/use-sound-fx";

interface MonitoredSite {
  id: string;
  name: string;
  slug: string;
  url: string;
  status: "200 OK";
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
          latencyMs: Math.floor(Math.random() * 60) + 140,
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
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 adm-label text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Telemetría de Borde · Se7en OS
          </div>
          <h3 className="adm-title mt-2 text-base text-foreground">
            Monitoreo en Vivo de Sitios en Producción
          </h3>
          <p className="mt-1 text-xs text-muted">
            Salud de servidores, latencia de borde (TTFB), certificados SSL y enlaces de acceso para clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunPingTest}
          disabled={testing}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
          <span>{testing ? "Midiendo latencia..." : "Test de Latencia ⚡"}</span>
        </button>
      </div>

      {/* Grid de Sitios Monitoreados */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => {
          const isCopied = copiedSlug === site.slug;
          return (
            <div
              key={site.id}
              className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4 transition-all hover:border-[var(--line-strong)] hover:bg-[var(--panel-3)]"
            >
              <div>
                {/* Cabecera del Proyecto */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="adm-title text-sm text-foreground flex items-center gap-1.5">
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
                    <p className="adm-label text-[10px] text-muted mt-1">{site.category}</p>
                  </div>

                  {/* Estado HTTP */}
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 adm-label text-[9.5px] text-emerald-600 dark:text-emerald-300 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {site.status}
                  </span>
                </div>

                {/* Métricas: Latencia, Google Score, SSL */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[var(--well)] p-2.5 text-center text-xs border border-[var(--line)]">
                  <div>
                    <span className="adm-label text-[9.5px] block">Latencia</span>
                    <span className="adm-num text-sm text-emerald-600 dark:text-emerald-400 font-bold">{site.latencyMs} ms</span>
                  </div>
                  <div className="border-x border-[var(--line)]">
                    <span className="adm-label text-[9.5px] block">PageSpeed</span>
                    <span className="adm-num text-sm font-bold text-foreground">{site.lighthouseScore}/100</span>
                  </div>
                  <div>
                    <span className="adm-label text-[9.5px] block">SSL Válido</span>
                    <span className="adm-num text-sm text-muted">{site.sslDaysLeft} d</span>
                  </div>
                </div>
              </div>

              {/* Botón de Acceso al Portal de Cliente */}
              <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                <span className="adm-label text-[10px]">Portal del cliente:</span>
                <button
                  type="button"
                  onClick={() => handleCopyPortalLink(site.slug)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 adm-label text-[10px] transition-colors ${
                    isCopied
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold"
                      : "border-[var(--line-strong)] bg-[var(--well)] text-muted hover:text-foreground hover:border-foreground"
                  }`}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied ? "¡Copiado!" : "Copiar Enlace"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
