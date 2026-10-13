"use server";

import { getSession } from "@/lib/admin/auth";
import { OWNERS } from "@/lib/admin/db";
import { noteNotice } from "@/lib/admin/digest";
import { notificationsConfigured, notify } from "@/lib/admin/notify";
import { PEOPLE } from "@/lib/admin/people";

/** Manda un aviso de prueba al tema configurado, para comprobar que llega al celular. */
export async function sendTestNotice(): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  const res = await notify({
    title: "Aviso de prueba",
    message: "Si lo ves en el celular, los avisos del panel funcionan.",
    path: "/admin/avisos",
  });
  return res.ok ? {} : { error: res.error };
}

/** Manda un aviso escrito a mano al otro socio (a su tema propio si lo tiene). */
export async function sendNote(text: string): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  const clean = String(text ?? "").trim();
  if (!clean) return { error: "Escribí el aviso." };
  if (!notificationsConfigured()) return { error: "Los avisos todavía no están activados." };
  const to = OWNERS.find((o) => o !== me.who);
  if (!to) return { error: "No hay a quién avisar." };
  const res = await notify(noteNotice(PEOPLE[me.who].name, clean), 4, to);
  return res.ok ? {} : { error: res.error };
}
