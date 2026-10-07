import { TeamMember, Testimonial } from "@/types";

export const team: TeamMember[] = [
  {
    id: "founder-01",
    name: "Franco Riquero",
    role: "Fundador · Desarrollo",
    bio: "Ingeniero industrial y fundador de dos startups propias (Sentinel y Takefyy). Construye cada producto digital del estudio de punta a punta: desde la base de datos hasta lo que ves en pantalla.",
    imageUrl: "/team/franco-riquero.jpg",
    linkedin: "https://www.linkedin.com/in/franco-riquero-117492355/",
    focus: ["Arquitectura", "Base de datos", "Backend", "Frontend"],
  },
  {
    id: "founder-02",
    name: "Federico Martín",
    role: "Fundador · Producto y diseño",
    bio: "Diseñador y desarrollador de producto. Creó APEX, software de entrenamiento: interfaz, código, pagos e IA. Traduce tu marca en pantallas cuidadas al detalle: tipografía, animación y experiencia.",
    imageUrl: "/team/federico-martin-2026-09.jpg",
    linkedin: "https://www.linkedin.com/in/federico-martin-632223231/",
    focus: ["Producto", "Interfaz", "Animación", "Pagos e IA"],
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "test-01",
    name: "Franco Riquero",
    role: "Fundador & CEO",
    company: "Takefyy",
    projectSlug: "takefyy",
    highlight: "Velocidad y calidad de producto",
    quote:
      "Se7en diseñó y construyó nuestra plataforma de punta a punta. La velocidad de iteración y la calidad visual superaron cualquier expectativa. Nuestros restaurantes asociados elogian constantemente la simpleza de uso.",
    // Franco es fundador de Se7en y de Takefyy: presentarlo como cliente es un
    // autotestimonio. Fuera hasta tener la cita de otra persona del equipo.
    published: false,
    order: 1,
  },
  {
    id: "test-02",
    name: "Simón Lacón",
    role: "Co-Founder & Director Creativo",
    company: "Poné La Pava",
    projectSlug: "pone-la-pava",
    highlight: "+120% en tasa de conversión",
    quote:
      "Captaron la identidad de la marca desde el día 1 y la tradujeron en una tienda online rápida, moderna y con altísima tasa de conversión. Trabajar directo con los fundadores sin intermediarios fue un cambio rotundo.",
    published: true,
    order: 2,
  },
  {
    id: "test-03",
    name: "Juan Garrafa",
    role: "Lead Instructor & Fundador",
    company: "Pravilo Argentina",
    projectSlug: "pravilo",
    highlight: "Identidad cinematográfica",
    quote:
      "Presentar un método nuevo en el país requería un nivel estético y de confianza impecable. La web refleja con exactitud la experiencia física de nuestro centro: cinematográfica, clara y sólida.",
    published: true,
    order: 3,
  },
  {
    id: "test-04",
    name: "Lautaro Silva",
    role: "Tech Lead",
    company: "Sentinel Climate Tech",
    projectSlug: "sentinel",
    highlight: "Visualización en tiempo real",
    quote:
      "Lograron transformar un flujo complejo de datos satelitales en una interfaz intuitiva, con tiempos de respuesta instantáneos y una arquitectura técnica impecable.",
    published: true,
    order: 4,
  },
];
