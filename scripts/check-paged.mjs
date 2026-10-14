// Verifica la paginación por rangos de Supabase: node scripts/check-paged.mjs
import assert from "node:assert/strict";

const { allRows, PAGE } = await import("../lib/admin/paged.ts");

// Una tabla falsa que, como PostgREST, nunca devuelve más de PAGE filas.
const table = (n) => {
  const rows = Array.from({ length: n }, (_, i) => ({ id: i }));
  const calls = [];
  const page = async (from, to) => {
    calls.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + PAGE)), error: null };
  };
  return { page, calls };
};

// Más de 1000: trae todas, sin repetir ni saltear.
{
  const t = table(2500);
  const res = await allRows(t.page);
  assert.equal(res.data.length, 2500);
  assert.deepEqual(res.data.map((r) => r.id), Array.from({ length: 2500 }, (_, i) => i));
  assert.equal(res.truncated, false);
  assert.deepEqual(t.calls, [[0, 999], [1000, 1999], [2000, 2999]]);
}

// Justo 1000: una vuelta más que llega vacía.
{
  const t = table(1000);
  const res = await allRows(t.page);
  assert.equal(res.data.length, 1000);
  assert.equal(t.calls.length, 2);
}

// Vacía y con tope.
assert.deepEqual((await allRows(table(0).page)).data, []);
{
  const res = await allRows(table(5000).page, 1500);
  assert.equal(res.data.length, 1500);
  assert.equal(res.truncated, true);
}

// Un error corta y se devuelve tal cual.
{
  const res = await allRows(async () => ({ data: null, error: { code: "PGRST205", message: "no está" } }));
  assert.equal(res.error.code, "PGRST205");
  assert.deepEqual(res.data, []);
}

console.log("paged OK");
