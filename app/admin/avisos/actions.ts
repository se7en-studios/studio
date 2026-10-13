"use server";

import { getSession } from "@/lib/admin/auth";
import { notify } from "@/lib/admin/notify";

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
