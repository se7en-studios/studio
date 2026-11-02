// Prospectos cargados desde el panel: lo que se ofrece en el formulario y cómo se
// valida. Puro y sin dependencias de la app: lo usan el formulario, las acciones y
// scripts/check-prospect-leads.mjs.

export const PROSPECT_CATEGORIES = [
  "Club de Pádel & Deporte",
  "Gimnasio & Entrenamiento",
  "Inmobiliaria",
  "Bodega & Enoturismo",
  "Hotelería & Cabañas",
  "Gastronomía & Cervecería",
  "Comercio & Gourmet",
  "Servicios Petroleros & Industria",
  "Salud & Estética",
  "Construcción & Corralón",
] as const;

export const KNOWN_CITIES = [
  "Catriel",
  "25 de Mayo",
  "Neuquén",
  "Cipolletti",
  "Plottier",
  "San Rafael",
  "Mendoza",
] as const;
export const PROVINCES = [
  "Río Negro",
  "Neuquén",
  "La Pampa",
  "Mendoza",
] as const;

export const WEBSITE_STATUSES = [
  "Sin sitio web propio",
  "Sitio lento / desactualizado",
  "Catálogo sin WhatsApp directo",
  "Dependencia de portales terceros",
  "Turnos manuales por chat",
] as const;

export type ProspectInput = {
  name: string;
  city: string;
  province: string;
  category: string;
  address: string;
  phone: string;
  current_site: string;
  website_status: string;
  pain_point: string;
  recommended_solution: string;
  estimated_budget_usd: number;
};

export const DEFAULT_BUDGET_USD = 1000;
const MAX_BUDGET_USD = 1_000_000;

const text = (v: unknown, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

/** Valida y limpia lo que llega del formulario; el error es el mensaje que se le muestra a quien lo cargó. */
export function cleanProspect(
  input: Partial<Record<keyof ProspectInput, unknown>>,
): ProspectInput {
  const name = text(input.name, 120);
  if (!name) throw new Error("Poné el nombre del negocio.");
  const city = text(input.city, 60);
  if (!city) throw new Error("Poné la ciudad.");

  const phone = text(input.phone, 40);
  if (
    !/^[0-9+()\s.-]{6,40}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 8
  ) {
    throw new Error(
      "El teléfono tiene que tener al menos 8 dígitos (con código de país, para WhatsApp).",
    );
  }

  // Sin protocolo se asume https; sólo http/https, nada de javascript: ni similares.
  let site = text(input.current_site, 200);
  if (site && !/^https?:\/\//i.test(site)) site = `https://${site}`;
  if (site && !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(site))
    throw new Error("La web no parece una dirección válida.");

  const status = text(input.website_status, 80) || WEBSITE_STATUSES[0];
  if (!(WEBSITE_STATUSES as readonly string[]).includes(status))
    throw new Error("Estado de la web inválido.");

  const raw = input.estimated_budget_usd;
  const budget =
    raw === "" || raw === null || raw === undefined
      ? DEFAULT_BUDGET_USD
      : Number(raw);
  if (!Number.isFinite(budget) || budget < 0 || budget > MAX_BUDGET_USD)
    throw new Error("El monto estimado no es válido.");

  return {
    name,
    city,
    province: text(input.province, 60),
    category: text(input.category, 80),
    address: text(input.address, 200),
    phone,
    current_site: site,
    website_status: status,
    pain_point: text(input.pain_point, 500),
    recommended_solution: text(input.recommended_solution, 500),
    estimated_budget_usd: Math.round(budget),
  };
}

/** Ciudades para los filtros: las conocidas primero y las que se sumaron después, en orden. */
export function orderedCities(all: string[]): string[] {
  const known = (KNOWN_CITIES as readonly string[]).filter((c) =>
    all.includes(c),
  );
  const extra = [
    ...new Set(
      all.filter((c) => !(KNOWN_CITIES as readonly string[]).includes(c)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  return [...known, ...extra];
}

/** Rubros para el filtro, con el mismo criterio. */
export function orderedCategories(all: string[]): string[] {
  const known = (PROSPECT_CATEGORIES as readonly string[]).filter((c) =>
    all.includes(c),
  );
  const extra = [
    ...new Set(
      all.filter(
        (c) => c && !(PROSPECT_CATEGORIES as readonly string[]).includes(c),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  return [...known, ...extra];
}
