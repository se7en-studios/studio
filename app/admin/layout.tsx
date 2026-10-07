import type { Metadata } from "next";
import { getSession } from "@/lib/admin/auth";
import { PanelNav } from "./nav";

// Panel interno de Franco y Federico. Fuera de buscadores (robots.ts también
// lo excluye).
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

// Sólo arma la barra del panel. El chequeo de sesión de verdad está en cada
// página y en cada acción: el layout no se vuelve a renderizar al navegar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession();
  if (!me) return children;
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pt-28 pb-20 md:px-8">
      <PanelNav who={me.who} />
      <div className="mt-10">{children}</div>
    </div>
  );
}
