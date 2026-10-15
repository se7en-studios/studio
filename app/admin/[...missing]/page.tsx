import { notFound } from "next/navigation";

// Una dirección del panel que no existe (/admin/xyz): sin esto la agarra el
// comodín del sitio (app/(site)/[...missing]) y muestra el 404 público. Así cae
// en app/admin/not-found.tsx, dentro del panel.
export default function AdminMissing() {
  notFound();
}
