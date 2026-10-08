import type { Metadata } from "next";
import Image from "next/image";
import { Download } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { projects } from "@/data/projects";
import { AdminGate, PageHeader } from "../ui";
import { AccentChip, ColorToken, MotionToken } from "./tokens";

export const metadata: Metadata = { title: "Marca" };

// Brand book: lo necesario para hacer algo de Se7en sin preguntar. Los
// colores y tiempos se leen en vivo de globals.css, así nunca quedan viejos.
const COLORS = [
  { name: "--background", label: "Fondo", note: "Lienzo principal de todo el sitio." },
  { name: "--surface", label: "Superficie 1", note: "Tarjetas, paneles y campos." },
  { name: "--surface-2", label: "Superficie 2", note: "Hover y capas sobre tarjetas." },
  { name: "--accent", label: "Acento", note: "Único color saturado: CTAs, estados activos y una palabra por titular." },
  { name: "--foreground", label: "Texto", note: "Titulares y texto de alto contraste." },
  { name: "--muted", label: "Texto secundario", note: "Párrafos, etiquetas y metadatos." },
];

const MOTION = [
  { name: "--ease", note: "la única curva del sitio" },
  { name: "--dur-fast", note: "color, chips, estados chicos" },
  { name: "--dur-base", note: "una tarjeta o un bloque" },
  { name: "--dur-slow", note: "una línea de texto" },
  { name: "--dur-hero", note: "la entrada del hero" },
  { name: "--stagger", note: "cascada entre hermanos" },
];

const LOGOS = [
  { src: "/logo.png", label: "Logo", size: "800 × 224", w: 800, h: 224, bg: "bg-background", fit: "max-w-[70%]" },
  { src: "/logo-simbolo.png", label: "Símbolo", size: "128 × 128", w: 128, h: 128, bg: "bg-surface", fit: "h-16 w-16" },
  { src: "/logo-simbolo.png", label: "Símbolo sobre claro", size: "128 × 128", w: 128, h: 128, bg: "bg-foreground", fit: "h-16 w-16" },
];

export default async function MarcaPage() {
  if (!(await panelSession())) return <AdminGate />;

  return (
    <div className="space-y-12">
      <PageHeader title="Marca">Logos, colores, tipografía y tono. Tocá un color para copiar su valor.</PageHeader>

      <section>
        <SectionTitle hint="Sólo hay PNG: falta el SVG y una versión del logo para fondo claro.">Logos</SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {LOGOS.map((l) => (
            <div key={l.label} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
              <div className={`flex aspect-[16/9] items-center justify-center ${l.bg}`}>
                <Image src={l.src} alt={l.label} width={l.w} height={l.h} className={`h-auto ${l.fit}`} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <span>
                  <span className="block text-sm text-foreground">{l.label}</span>
                  <span className="text-[11px] font-medium tracking-wide text-muted uppercase">PNG · {l.size}</span>
                </span>
                <a
                  href={l.src}
                  download
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
                >
                  <Download size={12} /> Bajar
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle hint="Leídos de globals.css en vivo.">Colores</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {COLORS.map((c) => (
            <ColorToken key={c.name} {...c} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Tipografía</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <p className="font-sans text-6xl tracking-[-0.035em] text-foreground">Aa 7</p>
            <p className="mt-4 text-foreground">Archivo</p>
            <p className="text-sm text-muted">Títulos y texto. Títulos en 600 con tracking −3,5 %, secciones en mayúsculas.</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <p className="font-mono text-5xl text-foreground">Aa 07</p>
            <p className="mt-6 text-foreground">Chivo Mono</p>
            <p className="text-sm text-muted">Etiquetas, datos y código. 11 a 12 px, mayúsculas con tracking amplio.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle hint="Para que todo lo que se mueve sea de la misma familia.">Movimiento</SectionTitle>
          <ul className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4">
            {MOTION.map((m) => (
              <MotionToken key={m.name} {...m} />
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle hint="De data/projects.ts.">Acentos de clientes</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {projects
              .filter((p) => p.brand?.accent)
              .map((p) => (
                <AccentChip key={p.slug} name={p.name} color={p.brand!.accent} />
              ))}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle hint="Sacado de cómo escribe la web hoy.">Tono de voz</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <VoiceCard title="Decimos" tone="text-emerald-300 bg-emerald-400/10">
            <li>Voseo y frases cortas: «Hablás directo con quien diseña».</li>
            <li>Números concretos: 2 a 3 semanas, 24 h hábiles, desde USD 1.200.</li>
            <li>Alcance claro desde el día uno.</li>
          </VoiceCard>
          <VoiceCard title="Evitamos" tone="text-amber-300 bg-amber-400/10">
            <li>Promesas sin un número atrás.</li>
            <li>Jerga técnica sin traducir.</li>
            <li>Intermediarios: siempre hablan los fundadores.</li>
          </VoiceCard>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-xl text-foreground">{children}</h2>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function VoiceCard({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
      <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase ${tone}`}>{title}</span>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground/85">{children}</ul>
    </div>
  );
}
