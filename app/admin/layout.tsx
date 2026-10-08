import type { Metadata } from "next";
import { getSession } from "@/lib/admin/auth";
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
  if (!me) return <div className="admin-app min-h-dvh">{children}</div>;
  return <AdminShell who={me.who}>{children}</AdminShell>;
}
