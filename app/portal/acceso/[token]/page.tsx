import type { Metadata } from "next";
import { RedeemForm } from "../../forms";

export const metadata: Metadata = { title: "Entrar" };

type Props = { params: Promise<{ token: string }> };

// La página NO toca la base ni canjea nada al abrirse: los que previsualizan
// links (WhatsApp, Slack) hacen GET y no deben gastar intentos ni dejar
// «último acceso». Se entra con el botón (POST, con límite por IP).
export default async function AccessPage({ params }: Props) {
  const { token } = await params;
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-card)] sm:p-8">
      <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em]">
        Tu portal en Se7en
      </h1>
      <p className="mt-2 text-[14px] text-muted">
        Acá vas a ver el estado de tu proyecto, aprobar entregas, pedirnos
        cambios y ver tus archivos y cobros.
      </p>
      <RedeemForm token={token.slice(0, 64)} />
    </section>
  );
}
