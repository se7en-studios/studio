// Cotización del dólar para cargar movimientos en Finanzas. API pública y sin
// clave (dolarapi.com), cacheada una hora. Si no responde, Finanzas sigue andando
// con la cotización escrita a mano en cada movimiento.
export type Rates = {
  oficial: number | null;
  mep: number | null;
  blue: number | null;
};

const NO_RATES: Rates = { oficial: null, mep: null, blue: null };
const TIMEOUT_MS = 4000;
const REVALIDATE_S = 3600;

type Quote = { casa?: string; venta?: number };

/** Pesos por dólar (venta) de cada tipo: oficial, MEP («bolsa») y blue. */
export async function fetchRates(): Promise<Rates> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: REVALIDATE_S },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const quotes = (await res.json()) as Quote[];
    const venta = (casa: string) => {
      const v = quotes.find((q) => q.casa === casa)?.venta;
      return typeof v === "number" && v > 0 ? v : null;
    };
    return {
      oficial: venta("oficial"),
      mep: venta("bolsa"),
      blue: venta("blue"),
    };
  } catch (e) {
    console.error("[finanzas] cotización:", e instanceof Error ? e.message : e);
    return NO_RATES;
  }
}
