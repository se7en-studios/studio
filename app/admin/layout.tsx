import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getSession } from "@/lib/admin/auth";
import { THEME_COOKIE, parseTheme } from "@/lib/admin/theme";
import "./admin-light.css";
import { AdminShell } from "./shell";

// Panel interno de Franco y Federico. Fuera de buscadores (robots.ts también
// lo excluye). No hereda nada del sitio público (ver app/(site)/layout.tsx).
export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

// Sólo arma el marco del panel. El chequeo de sesión de verdad está en cada
// página y en cada acción: el layout no se vuelve a renderizar al navegar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  if (!me) return <div className="admin-app min-h-dvh" data-theme={theme}>{children}</div>;
  return <AdminShell who={me.who} theme={theme}>{children}</AdminShell>;
}
