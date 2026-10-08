import { notFound } from "next/navigation";

// Cualquier URL que no exista cae acá y muestra el 404 del sitio
// (app/(site)/not-found.tsx), con navbar y footer. Si el 404 viviera en la
// raíz con todo el sitio adentro, cada página del panel cargaría el navbar, el
// footer 3D y el resto de la capa visual sólo para tener el 404 a mano.
export default function Missing() {
  notFound();
}
