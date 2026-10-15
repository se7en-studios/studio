// Supabase (PostgREST) devuelve como máximo 1000 filas por consulta aunque se
// pida más con .limit(), y no avisa: lo que pasa de ahí se pierde en silencio.
// Esto trae todas, de a una página con .range(). Puro: se prueba con
// scripts/check-paged.mjs.

export const PAGE = 1000;
/** Tope total por consulta: que una tabla que creció de más no tumbe la página. */
export const MAX_ROWS = 20_000;

type Page<E> = (
  from: number,
  to: number,
) => PromiseLike<{ data: unknown; error: E | null }>;

/**
 * Todas las filas de una consulta. `page(from, to)` arma la consulta con
 * `.range(from, to)` y un orden ESTABLE (que termine en una columna única, como
 * id): sin eso, entre una página y la siguiente se repiten o se saltean filas.
 */
export async function allRows<T, E = { code?: string; message: string }>(
  page: Page<E>,
  max = MAX_ROWS,
): Promise<{ data: T[]; error: E | null; truncated: boolean }> {
  const data: T[] = [];
  while (data.length < max) {
    const want = Math.min(PAGE, max - data.length);
    const res = await page(data.length, data.length + want - 1);
    if (res.error) return { data, error: res.error, truncated: false };
    const rows = (res.data ?? []) as T[];
    data.push(...rows);
    if (rows.length < want) return { data, error: null, truncated: false };
  }
  return { data, error: null, truncated: true };
}
