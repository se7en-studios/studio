import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { getSession } from "@/lib/admin/auth";
import { listenTopic, notificationServer } from "@/lib/admin/notify";
import { THEME_COOKIE, parseTheme } from "@/lib/admin/theme";
import "./admin-light.css";
import { AdminShell } from "./shell";

// Panel interno de Franco y Federico. Fuera de buscadores (robots.ts también
// lo excluye). No hereda nada del sitio público (ver app/(site)/layout.tsx).
export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
  // App instalable en el celular (public/admin): abre a pantalla completa y sólo dentro de /admin.
  manifest: "/admin/manifest.webmanifest",
  icons: { icon: "/admin/icon-192.png", apple: "/admin/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Se7en Panel", statusBarStyle: "black-translucent" },
};

/** El color de la barra del celular sigue al tema elegido en el panel. */
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return { themeColor: theme === "light" ? "#f1f1ee" : "#0a0a0b" };
}

// Sólo arma el marco del panel. El chequeo de sesión de verdad está en cada
// página y en cada acción: el layout no se vuelve a renderizar al navegar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  if (!me) return <div className="admin-app min-h-dvh" data-theme={theme}>{children}</div>;
  // Tema al que escucha esta persona para recibir llamadas; solo lo ve quien tiene sesión.
  const topic = listenTopic(me.who);
  return (
    <AdminShell who={me.who} theme={theme} callFeed={topic ? { topic, server: notificationServer() } : null}>
      {children}
    </AdminShell>
  );
}
