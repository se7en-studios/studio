// Deja importar los .ts del panel directo desde las pruebas (Node 22+): resuelve
// los imports sin extensión («./tz») probando con «.ts». Importarlo primero.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(s, c, next) {
        try { return await next(s, c); }
        catch (e) { if (s.startsWith(".")) return next(s + ".ts", c); throw e; }
      }`,
    ),
);
