"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Layers,
  Calculator,
  Mail,
  Calendar,
  Sparkles,
  Zap,
  Code2,
  FolderGit2,
  TrendingUp,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { projects } from "@/data/projects";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { SITE } from "@/data/site";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Proyectos" | "Servicios" | "Acciones Rápidas" | "Navegación";
  icon: LucideIcon | typeof WhatsAppLogo;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Escuchar atajos de teclado Cmd+K, Ctrl+K y '/'
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    function handleCustomOpen() {
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [open]);

  // Reset al abrir, durante el render (no en un effect: evita un render en cascada).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Acciones Rápidas
      {
        id: "action-start-brief",
        title: "Iniciar Briefing Interactivo (/start)",
        subtitle: "Configurá tu proyecto en 3 minutos y generá un roadmap técnico",
        category: "Acciones Rápidas",
        icon: Sparkles,
        keywords: ["brief", "iniciar", "start", "proyecto", "cotizar", "roadmap", "onboarding"],
        action: () => {
          setOpen(false);
          router.push("/start");
        },
      },
      {
        id: "action-booking",
        title: "Agendar Discovery Call (15 min)",
        subtitle: "Reunión breve de scoping con Franco y Federico",
        category: "Acciones Rápidas",
        icon: Calendar,
        keywords: ["llamada", "reunion", "calendly", "agendar", "scoping", "meet"],
        action: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent("open-booking-modal"));
        },
      },
      {
        id: "action-pricing",
        title: "Ver Precios & Planes Transparentes (/pricing)",
        subtitle: "Configurá el alcance y generá un presupuesto inmediato",
        category: "Acciones Rápidas",
        icon: Calculator,
        keywords: ["precios", "planes", "costos", "cuanto", "vale", "presupuesto", "pricing"],
        action: () => {
          setOpen(false);
          router.push("/pricing");
        },
      },
      {
        id: "action-estimator",
        title: "Calcular Presupuesto Rápido",
        subtitle: "Cotizador interactivo en tiempo real con tiempos y costos",
        category: "Acciones Rápidas",
        icon: Calculator,
        keywords: ["cotizador", "precio", "estimar", "costo", "presupuesto"],
        action: () => {
          setOpen(false);
          router.push("/pricing");
        },
      },
      {
        id: "action-roi",
        title: "Calculadora de Ahorro & Retorno (ROI)",
        subtitle: "Proyectá cuánto dinero ahorrás en comisiones de Shopify/apps",
        category: "Acciones Rápidas",
        icon: TrendingUp,
        keywords: ["roi", "ahorro", "comisiones", "retorno", "shopify", "pedidosya", "inversion"],
        action: () => {
          setOpen(false);
          router.push("/roi");
        },
      },
      {
        id: "action-whatsapp",
        title: "Escribirnos directamente por WhatsApp",
        subtitle: "+54 9 299 424-7985 (Respuesta en < 24 h)",
        category: "Acciones Rápidas",
        icon: WhatsAppLogo,
        keywords: ["whatsapp", "chat", "mensaje", "contacto"],
        action: () => {
          setOpen(false);
          window.open(`${SITE.whatsapp}?text=Hola%20Se7en%20Studio!`, "_blank");
        },
      },
      {
        id: "action-audit",
        title: "Solicitar Auditoría Técnica Gratuita en Video",
        subtitle: "Diagnóstico de 3 puntos (velocidad, seguridad y conversión)",
        category: "Acciones Rápidas",
        icon: Sparkles,
        keywords: ["auditoria", "diagnostico", "gratis", "video", "velocidad", "audit"],
        action: () => {
          setOpen(false);
          router.push("/audit");
        },
      },
      {
        id: "action-copy-email",
        title: "Copiar correo electrónico oficial",
        subtitle: SITE.email,
        category: "Acciones Rápidas",
        icon: Mail,
        keywords: ["email", "correo", "mail", "copiar"],
        action: () => {
          navigator.clipboard.writeText(SITE.email);
          setOpen(false);
        },
      },

      // Navegación
      {
        id: "nav-kickoff",
        title: "Portal de Kickoff & Onboarding",
        subtitle: "Configurá accesos GitHub, assets y canal de staging",
        category: "Navegación",
        icon: Sparkles,
        keywords: ["kickoff", "onboarding", "inicio", "assets", "github", "setup"],
        action: () => {
          setOpen(false);
          router.push("/kickoff");
        },
      },
      {
        id: "nav-testimonials",
        title: "Casos de Éxito & Testimonios",
        subtitle: "Métricas de negocio verificadas y resultados de clientes",
        category: "Navegación",
        icon: Layers,
        keywords: ["testimonios", "historias", "clientes", "metricas", "opiniones", "reviews"],
        action: () => {
          setOpen(false);
          router.push("/testimonials");
        },
      },
      {
        id: "nav-playground",
        title: "Playground Técnico & Server Actions",
        subtitle: "Probá en vivo consultas Supabase, Zod y streaming IA",
        category: "Navegación",
        icon: Terminal,
        keywords: ["playground", "consola", "server actions", "api", "zod", "supabase"],
        action: () => {
          setOpen(false);
          router.push("/playground");
        },
      },
      {
        id: "nav-work",
        title: "Ver Portafolio Completo",
        subtitle: "Archivo con buscador y filtros de proyectos",
        category: "Navegación",
        icon: Layers,
        keywords: ["proyectos", "trabajos", "portfolio", "work"],
        action: () => {
          setOpen(false);
          router.push("/work");
        },
      },
      {
        id: "nav-services",
        title: "Explorar Servicios & Entregables",
        subtitle: "SaaS, E-Commerce, Landing Pages y Modelos de IA",
        category: "Navegación",
        icon: Sparkles,
        keywords: ["servicios", "entregables", "paquetes", "precios"],
        action: () => {
          setOpen(false);
          router.push("/services");
        },
      },
      {
        id: "nav-tech",
        title: "Radar Tecnológico & Stack",
        subtitle: "Tecnologías que adoptamos, evaluamos y evitamos",
        category: "Navegación",
        icon: Code2,
        keywords: ["tech", "radar", "stack", "tecnologias", "turbopack", "supabase"],
        action: () => {
          setOpen(false);
          router.push("/tech");
        },
      },
      {
        id: "nav-blog",
        title: "Blog de Ingeniería & Estrategia",
        subtitle: "Artículos de arquitectura, Core Web Vitals y lecciones",
        category: "Navegación",
        icon: Layers,
        keywords: ["blog", "articulos", "posts", "lecturas", "guias"],
        action: () => {
          setOpen(false);
          router.push("/blog");
        },
      },

      // Servicios específicos
      {
        id: "srv-saas",
        title: "Desarrollo SaaS & Plataformas",
        subtitle: "Next.js 16, Supabase Postgres, Auth y Server Actions",
        category: "Servicios",
        icon: Code2,
        keywords: ["saas", "dashboard", "panel", "aplicacion", "supabase", "nextjs"],
        action: () => {
          setOpen(false);
          router.push("/services#saas");
        },
      },
      {
        id: "srv-ecom",
        title: "E-Commerce de Alta Conversión",
        subtitle: "Tiendas ultrarrápidas y flujos directos de checkout",
        category: "Servicios",
        icon: Zap,
        keywords: ["tienda", "ecommerce", "catalogo", "checkout", "ventas"],
        action: () => {
          setOpen(false);
          router.push("/services#ecommerce");
        },
      },

      // Proyectos
      ...projects.map((p) => ({
        id: `proj-${p.slug}`,
        title: `${p.name} — ${p.category}`,
        subtitle: p.shortDescription,
        category: "Proyectos" as const,
        icon: FolderGit2,
        keywords: [p.name.toLowerCase(), p.category.toLowerCase(), ...(p.technology || []).map((t) => t.toLowerCase())],
        action: () => {
          setOpen(false);
          router.push(`/work/${p.slug}`);
        },
      })),
    ];

    return list;
  }, [router]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q))
    );
  }, [items, query]);

  // Manejo de flechas y selección
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredItems, selectedIndex]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            {/* Input Header */}
            <div className="relative flex items-center border-b border-border px-4 py-3.5">
              <Search size={18} className="text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Escribí para buscar proyectos, servicios o acciones..."
                className="w-full bg-transparent px-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted">
                  ESC
                </span>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted font-mono">
                  No se encontraron resultados para &quot;{query}&quot;
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-accent/10 text-foreground border border-accent/30"
                            : "text-muted hover:bg-surface-2 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-accent text-background"
                                : "bg-background border border-border text-muted"
                            }`}
                          >
                            <Icon size={16} />
                          </span>
                          <div className="overflow-hidden">
                            <p className="truncate text-xs font-medium text-foreground">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="truncate text-[11px] text-muted">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted">
                            {item.category}
                          </span>
                          {isSelected && (
                            <ArrowRight size={14} className="text-accent" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Tip */}
            <div className="border-t border-border bg-surface-2/40 px-4 py-2.5 flex items-center justify-between font-mono text-[10px] text-muted">
              <div className="flex items-center gap-3">
                <span>↑↓ para navegar</span>
                <span>↵ para seleccionar</span>
                <span>ESC para cerrar</span>
              </div>
              <span className="text-accent">Se7en Studio Quick Access</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
