import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { PanelNotReady } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";
import { listAccounts } from "@/lib/admin/vault";
import { newVaultKey, vaultReady } from "@/lib/admin/vault-crypto";
import type { Account } from "@/lib/admin/vault-shared";
import { AdminGate, PageHeader } from "../ui";
import { VaultSetup } from "./setup";
import { VaultView } from "./view";

export const metadata: Metadata = { title: "Cuentas" };

export default async function CuentasPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  let accounts: Account[] = [];
  let missing: string | null = null;
  try {
    accounts = await listAccounts();
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    missing = e.message;
  }
  const keyReady = vaultReady();

  return (
    <div className="space-y-6">
      <PageHeader title="Cuentas">
        La caja fuerte del estudio: usuarios y claves de Instagram, Vercel,
        Supabase, Gmail y el resto. Las claves quedan cifradas y se abren con la
        contraseña del panel; cada vez que alguien abre una, queda en el
        Registro.
      </PageHeader>
      {!keyReady || missing ? (
        <VaultSetup
          missing={missing}
          keyReady={keyReady}
          suggestion={keyReady ? null : newVaultKey()}
        />
      ) : (
        <VaultView accounts={accounts} today={dayKey()} />
      )}
    </div>
  );
}
