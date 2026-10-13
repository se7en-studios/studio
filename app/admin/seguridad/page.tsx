import type { Metadata } from "next";
import qrcode from "qrcode-generator";
import {
  hasOwnPassword,
  hasTotp,
  panelSession,
  sessionSecretStrong,
  sharedPasswordActive,
} from "@/lib/admin/auth";
import { notificationsConfigured } from "@/lib/admin/notify";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { newTotpSecret, otpauthUri } from "@/lib/admin/totp";
import { vaultReady } from "@/lib/admin/vault-crypto";
import { Card, cn } from "../kit";
import { AdminGate, PageHeader } from "../ui";
import { TotpSetup } from "./setup";

export const metadata: Metadata = { title: "Seguridad" };

type Row = { label: string; ok: boolean; hint: string };

function qrSvg(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

export default async function SeguridadPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const other = PEOPLE_IDS.find((p) => p !== me.who) ?? me.who;
  const mine = me.who.toUpperCase();
  const names = { me: PEOPLE[me.who].name, other: PEOPLE[other].name };
  const bothOwn = hasOwnPassword(me.who) && hasOwnPassword(other);

  const rows: Row[] = [
    {
      label: `Contraseña propia de ${names.me}`,
      ok: hasOwnPassword(me.who),
      hint: `Cargá ADMIN_PASSWORD_${mine} en Vercel.`,
    },
    {
      label: `Contraseña propia de ${names.other}`,
      ok: hasOwnPassword(other),
      hint: `Que cargue ADMIN_PASSWORD_${other.toUpperCase()} en Vercel.`,
    },
    {
      label: "Contraseña compartida apagada",
      ok: !sharedPasswordActive(),
      hint: bothOwn
        ? "Los dos ya tienen la propia: borrá ADMIN_PASSWORD de Vercel y redeployá."
        : "Se apaga cuando los dos tengan la propia (borrando ADMIN_PASSWORD).",
    },
    {
      label: `Segundo paso de ${names.me}`,
      ok: hasTotp(me.who),
      hint: "Activalo en el recuadro de al lado.",
    },
    {
      label: `Segundo paso de ${names.other}`,
      ok: hasTotp(other),
      hint: "Lo activa desde esta misma pantalla.",
    },
    {
      label: "Firma de las sesiones",
      ok: sessionSecretStrong(),
      hint: "ADMIN_SESSION_SECRET tiene que tener 32 caracteres o más.",
    },
    {
      label: "Llave de la caja fuerte",
      ok: vaultReady(),
      hint: "Falta VAULT_KEY en Vercel.",
    },
    {
      label: "Avisos al celular",
      ok: notificationsConfigured(),
      hint: "Falta NTFY_TOPIC en Vercel.",
    },
  ];
  const done = rows.filter((r) => r.ok).length;

  const enrolled = hasTotp(me.who);
  const secret = enrolled ? null : newTotpSecret();
  const uri = secret ? otpauthUri(names.me.toLowerCase(), secret) : "";

  return (
    <div className="space-y-6">
      <PageHeader title="Seguridad">
        Cómo está protegido el panel: contraseñas, segundo paso al entrar y las
        llaves que usa por dentro. Acá solo se ve si está listo o pendiente,
        nunca los valores.
      </PageHeader>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="Estado" count={`${done}/${rows.length}`}>
          <ul className="divide-y divide-[var(--line)]">
            {rows.map((r) => (
              <li
                key={r.label}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{r.label}</p>
                  {!r.ok && (
                    <p className="mt-0.5 text-[12px] text-muted">{r.hint}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                    r.ok
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-amber-400/10 text-amber-300",
                  )}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-current"
                  />
                  {r.ok ? "Listo" : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {secret ? (
          <TotpSetup
            secret={secret}
            uri={uri}
            svg={qrSvg(uri)}
            envName={`TOTP_SECRET_${mine}`}
          />
        ) : (
          <Card title="Segundo paso">
            <div className="space-y-2 p-4 text-[13px] text-muted">
              <p className="text-emerald-300">
                Activado para {names.me}: entrar pide la contraseña y el código
                de tu app.
              </p>
              <p>
                Si perdés el celular, borrá{" "}
                <code className="rounded bg-white/[0.06] px-1 text-foreground">
                  TOTP_SECRET_{mine}
                </code>{" "}
                en Vercel y redeployá: el segundo paso se apaga y volvés a
                entrar solo con la contraseña. Después lo activás de nuevo con
                un secreto nuevo.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
