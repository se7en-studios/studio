// Límite de envíos por IP, guardado en la tabla `rate_limit_hits`
// (supabase/rate-limit.sql). Sólo servidor: usa la service role key vía db().
// Si la tabla no existe o Supabase falla, deja pasar (fail open) y lo loguea:
// un formulario caído pierde leads; un límite caído sólo pierde el límite.
import { createHash } from "node:crypto";
import { db } from "@/lib/admin/db";

/** IP del visitante: primera entrada de x-forwarded-for, o x-real-ip. */
export function clientIp(h: Headers): string {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}

function keyHash(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

/** true si la IP ya llegó a `limit` registros en la ventana. */
export async function isLimited(
  bucket: string,
  ip: string,
  limit: number,
  windowMs: number,
) {
  const c = db();
  if (!c) return false;
  const { count, error } = await c
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("key_hash", keyHash(ip))
    .gte("created_at", new Date(Date.now() - windowMs).toISOString());
  if (error) {
    console.error(
      `[rate-limit] ${bucket}: no se pudo contar, se deja pasar:`,
      error.message,
    );
    return false;
  }
  return (count ?? 0) >= limit;
}

export async function recordHit(bucket: string, ip: string) {
  const c = db();
  if (!c) return;
  const { error } = await c
    .from("rate_limit_hits")
    .insert({ bucket, key_hash: keyHash(ip) });
  if (error)
    console.error(
      `[rate-limit] ${bucket}: no se pudo registrar:`,
      error.message,
    );
}

/** Cuenta y registra en un paso. false = rechazar. */
// ponytail: contar + insertar no es atómico; una ráfaga simultánea puede pasar
// unos pocos de más. Si importa, mover a una función SQL con lock.
export async function allowRequest(
  bucket: string,
  ip: string,
  limit: number,
  windowMs: number,
) {
  if (await isLimited(bucket, ip, limit, windowMs)) return false;
  await recordHit(bucket, ip);
  return true;
}
