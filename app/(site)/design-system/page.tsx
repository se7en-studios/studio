import { Metadata } from "next";
import { DesignSystemClient } from "./design-system-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Design System & Tokens Atómicos | Se7en Studio",
  description:
    "Explorá el sistema de diseño de Se7en Studio: tokens de color OLED, tipografía cinemática, micro-interacciones a 60 FPS y componentes atómicos.",
  openGraph: {
    title: "Design System & Tokens Atómicos | Se7en Studio",
    description:
      "Explorá el sistema de diseño de Se7en Studio: tokens de color OLED, tipografía cinemática, micro-interacciones a 60 FPS y componentes atómicos.",
    url: `${SITE.url}/design-system`,
  },
};

export default function DesignSystemPage() {
  return <DesignSystemClient />;
}
