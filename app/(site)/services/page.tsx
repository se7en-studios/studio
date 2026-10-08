import { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Layers,
  Rocket,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Zap,
  Layout,
  ShoppingCart,
  Bot,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { services, process } from "@/data/services";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Servicios y Entregables | Se7en Studio",
  description:
    "Plataformas web, tiendas online de alta conversión, landing pages y soluciones con Inteligencia Artificial. Conocé nuestros paquetes y qué incluye cada uno.",
  openGraph: {
    title: "Servicios y Entregables | Se7en Studio",
    description:
      "Plataformas web, tiendas online de alta conversión, landing pages y soluciones con Inteligencia Artificial. Conocé nuestros paquetes y qué incluye cada uno.",
    url: `${SITE.url}/services`,
  },
};

const detailedServices = [
  {
    number: "01",
    id: "saas",
    title: "Plataformas y Aplicaciones Web",
    tagline: "Aplicaciones web completas diseñadas para escalar",
    icon: Layout,
    timeline: "2 a 4 semanas",
    description:
      "Construimos tu plataforma completa, de punta a punta. Incluye inicio de sesión, distintos tipos de usuario, pagos online y paneles de administración en tiempo real.",
    deliverables: [
      "Programación completa de tu plataforma",
      "Base de datos segura y organizada",
      "Inicio de sesión seguro (email, Google, contraseña)",
      "Paneles de administración y estadísticas",
      "Cobros online (tarjeta, Mercado Pago y más)",
      "Publicación automática ante cada actualización",
    ],
    idealFor:
      "Startups y empresas que necesitan lanzar un primer producto o hacer crecer el que ya tienen.",
  },
  {
    number: "02",
    id: "ecommerce",
    title: "E-Commerce & Experiencias de Marca",
    tagline: "Tiendas ultrarrápidas pensadas para maximizar ventas",
    icon: ShoppingCart,
    timeline: "2 a 3 semanas",
    description:
      "Desarrollamos tiendas online a medida que cargan al instante y convierten visitas en compras. Sin los límites de diseño ni la lentitud de las plataformas genéricas.",
    deliverables: [
      "Catálogo de productos interactivo y autogestionable",
      "Flujo de checkout fluido (directo a WhatsApp o pasarela de pago)",
      "Gestión de stock e inventario en tiempo real",
      "Máxima velocidad de carga",
      "Panel de administración intuitivo para cargar productos",
      "Estadísticas de visitas y ventas conectadas",
    ],
    idealFor:
      "Marcas que venden directo al público, comercios gastronómicos y negocios con identidad propia.",
  },
  {
    number: "03",
    id: "landing",
    title: "Landing Pages & Sitios de Marca",
    tagline: "Presencia digital premium de altísimo impacto visual",
    icon: Zap,
    timeline: "1 a 2 semanas",
    description:
      "Creamos la cara digital de tu empresa: un diseño impecable, animaciones suaves y una estructura pensada para convertir visitas en clientes.",
    deliverables: [
      "Diseño a medida con un prototipo que podés probar antes de construir nada",
      "Programación completa de tu sitio",
      "Animaciones y detalles que le dan vida al sitio",
      "Formulario de contacto protegido contra spam",
      "Buen posicionamiento en Google y vista previa lista para redes",
      "Se ve perfecto en celular, tablet y computadora",
    ],
    idealFor:
      "Empresas de servicios, consultoras, lanzamientos de producto y marcas que buscan diferenciarse.",
  },
  {
    number: "04",
    id: "ai",
    title: "Inteligencia Artificial & Automatización",
    tagline: "Automatización inteligente y datos en tiempo real",
    icon: Bot,
    timeline: "2 a 3 semanas",
    description:
      "Sumamos inteligencia artificial a tu producto: asistentes conversacionales, análisis de datos en vivo (incluso satelitales) y automatizaciones a medida.",
    deliverables: [
      "Asistentes con inteligencia artificial, búsqueda inteligente y resúmenes automáticos",
      "Conexión con fuentes de datos externas, incluso satelitales",
      "Automatización de tareas internas y notificaciones",
      "Uso eficiente para mantener los costos bajo control",
      "Manejo seguro de accesos y límites de uso",
    ],
    idealFor:
      "Productos de tecnología climática, plataformas inteligentes y empresas con tareas repetitivas.",
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Cabecera Principal */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Sparkles size={13} className="text-accent" />
            <span>Servicios & Entregables</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Diseño y desarrollo. <br />
            <span className="text-accent">Sin atajos ni plantillas.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Creamos productos digitales a medida, rápidos, prolijos y con el
            código 100% a tu nombre.
          </p>
        </div>

        {/* Garantías y Pilares rápidos */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface/60 p-6">
            <ShieldCheck className="text-accent" size={24} />
            <h3 className="mt-3 font-medium text-foreground">
              30 Días de Garantía
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Soporte técnico y ajustes post-lanzamiento sin costo adicional
              para asegurar estabilidad total.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface/60 p-6">
            <Code2 className="text-accent" size={24} />
            <h3 className="mt-3 font-medium text-foreground">
              100% Código Propio
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              El código es tuyo, en tu propia cuenta de GitHub. Sin ataduras ni
              suscripciones ocultas.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface/60 p-6">
            <Rocket className="text-accent" size={24} />
            <h3 className="mt-3 font-medium text-foreground">
              Entregas en 1-3 Semanas
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Avances que podés ver cada semana, sin la burocracia de una
              agencia tradicional.
            </p>
          </div>
        </div>

        {/* Desglose Detallado de Servicios */}
        <div className="mt-20 space-y-12">
          {detailedServices.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                id={service.id}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-accent/40 lg:p-12"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Icon size={20} />
                      </span>
                      <span className="font-mono text-xs text-muted uppercase tracking-widest">
                        Servicio {service.number}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-xs text-muted">
                        <Clock size={11} className="text-accent" />
                        {service.timeline}
                      </span>
                    </div>

                    <h2 className="display mt-6 text-2xl text-foreground sm:text-3xl lg:text-4xl">
                      {service.title}
                    </h2>
                    <p className="mt-2 text-base font-medium text-accent">
                      {service.tagline}
                    </p>
                    <p className="mt-4 text-base leading-relaxed text-muted">
                      {service.description}
                    </p>

                    <div className="mt-4 rounded-lg bg-background/80 border border-border/80 p-3.5 text-xs text-muted">
                      <strong className="text-foreground">Ideal para:</strong>{" "}
                      {service.idealFor}
                    </div>
                  </div>

                  {/* Lista de Entregables */}
                  <div className="w-full lg:max-w-md rounded-xl border border-border/80 bg-background/50 p-6">
                    <h3 className="font-mono text-xs uppercase tracking-widest text-foreground font-medium mb-4 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-accent" />
                      Entregables incluidos:
                    </h3>
                    <ul className="space-y-2.5">
                      {service.deliverables.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-xs leading-relaxed text-muted"
                        >
                          <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                      <Link
                        href="/pricing"
                        className="focus-ring inline-flex items-center gap-1.5 text-xs font-mono text-accent hover:underline"
                      >
                        <span>Calcular presupuesto</span>
                        <ArrowRight size={12} />
                      </Link>
                      <Link
                        href="/#contact"
                        className="focus-ring inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground"
                      >
                        <span>Consultar</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Proceso y Metodología */}
        <div className="mt-24 border-t border-border pt-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs tracking-widest uppercase text-muted">
              Metodología de trabajo
            </span>
            <h2 className="display mt-3 text-3xl text-foreground md:text-4xl">
              De la idea al lanzamiento en 4 pasos.
            </h2>
            <p className="mt-3 text-base text-muted">
              Un flujo ágil, sin reuniones innecesarias y con comunicación
              directa con los desarrolladores y diseñadores.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-border bg-surface p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-accent">
                    {step.number}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-xs text-muted">
                    {step.duration}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-medium text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner en /services */}
        <Reveal>
          <div className="mt-20 rounded-2xl border border-accent/30 bg-surface p-8 md:p-12 text-center flex flex-col items-center justify-center">
            <h3 className="display text-3xl text-foreground sm:text-4xl">
              ¿Listo para empezar tu proyecto?
            </h3>
            <p className="mt-3 max-w-lg text-base text-muted">
              Contanos sobre tu idea y te armamos una propuesta técnica con
              cotización y fecha estimada de entrega.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/#contact"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-medium text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(255,77,46,0.35)]"
              >
                <span>Hablemos de tu idea</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/work"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-8 py-4 text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                <span>Ver proyectos anteriores</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
