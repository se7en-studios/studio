import type { Metadata } from "next";
import { Download } from "lucide-react";
import qrcode from "qrcode-generator";
import {
  hasOwnPassword,
  hasTotp,
  panelSession,
  sessionEpoch,
} from "@/lib/admin/auth";
import { MIN_PASSPHRASE } from "@/lib/admin/backup-shared";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { newTotpSecret, otpauthUri } from "@/lib/admin/totp";
import { TZ } from "@/lib/admin/tz";
import { Card, btnSecondary, cn, input } from "../kit";
import { AdminGate, PageHeader } from "../ui";
import { securityChecklist } from "./checklist";
import { SessionsCard } from "./sessions";
import { TotpSetup } from "./setup";

export const metadata: Metadata = { title: "Seguridad" };

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

  const rows = securityChecklist(me.who);
  const done = rows.filter((r) => r.ok).length;

  const pendingRows = rows.filter((r) => !r.ok);
  const epoch = await sessionEpoch();
  const lastCut = epoch
    ? new Date(epoch).toLocaleString("es-AR", { timeZone: TZ, dateStyle: "long", timeStyle: "short" })
    : null;

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

        {pendingRows.length > 0 && <NextSteps names={names} bothOwn={bothOwn} />}
        <SessionsCard lastCut={lastCut} />
        <BackupCard monthly={(process.env.BACKUP_PASSPHRASE?.length ?? 0) >= MIN_PASSPHRASE} />
      </div>
    </div>
  );
}

const code = "rounded bg-white/[0.06] px-1 text-foreground";

/**
 * Lo que falta para el 8 de 8, en orden. Es configuración de Vercel que hacen
 * los socios: el panel no puede (ni debe) tocar sus propias variables.
 */
function NextSteps({ names, bothOwn }: { names: { me: string; other: string }; bothOwn: boolean }) {
  return (
    <Card title="Cómo llegar a 8 de 8">
      <ol className="list-decimal space-y-2 p-4 pl-9 text-[13px] text-muted">
        <li>
          <span className="text-foreground">Contraseña propia de cada uno.</span> En Vercel → Settings → Environment
          Variables (Production), cada uno crea <code className={code}>ADMIN_PASSWORD_FRANCO</code> o{" "}
          <code className={code}>ADMIN_PASSWORD_FEDERICO</code> con una contraseña larga que no use en otro lado.
          Redeployar. Desde ahí, a cada uno le sirve sólo la suya.
        </li>
        <li>
          <span className="text-foreground">Segundo paso de cada uno.</span> Entrando cada uno con su usuario, en esta
          página: escanear el QR con la app (Google Authenticator, 1Password…), poner el código para comprobarlo y
          cargar en Vercel la línea <code className={code}>TOTP_SECRET_…</code> que aparece. Redeployar. {names.me} lo
          hace desde su sesión y {names.other} desde la suya.
        </li>
        <li>
          <span className="text-foreground">Apagar la contraseña compartida.</span>{" "}
          {bothOwn ? "Los dos ya tienen la propia: " : "Recién cuando los dos tengan la propia: "}
          borrar <code className={code}>ADMIN_PASSWORD</code> en Vercel y redeployar. Mientras exista, cualquiera de
          los dos puede entrar como el otro y el Registro no garantiza quién hizo qué.
        </li>
        <li>
          <span className="text-foreground">Después de cada cambio,</span> volver a esta página: la lista de arriba se
          actualiza sola. Si algo queda mal cargado, el ingreso de esa persona se bloquea hasta corregirlo (falla
          cerrado), así que conviene hacerlo de a uno y con el otro conectado.
        </li>
      </ol>
    </Card>
  );
}

/** Copia de todo lo que el panel guarda en Supabase: a mano (con o sin frase) y la mensual automática. */
function BackupCard({ monthly }: { monthly: boolean }) {
  return (
    <Card title="Copia de seguridad" icon={<Download size={14} />}>
      <div className="space-y-3 p-4 text-[13px] text-muted">
        <p>
          Un archivo con los pedidos, proyectos, tareas, mensajes, finanzas, contenido y las cuentas (estas siguen
          cifradas con la llave de la caja). No incluye los archivos subidos, solo su lista. El plan gratis de
          Supabase no hace copias solo.
        </p>
        <form method="post" action="/admin/api/respaldo" className="space-y-2">
          <label htmlFor="backup-frase" className="block text-[11px] font-medium tracking-wide text-muted uppercase">
            Frase para cifrarla (recomendado)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="backup-frase"
              name="frase"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSPHRASE}
              placeholder={`${MIN_PASSPHRASE} caracteres o más`}
              className={cn(input, "min-w-0 flex-1")}
            />
            <button type="submit" className={btnSecondary}>
              <Download size={14} /> Descargar copia
            </button>
          </div>
          <p className="text-[12px]">
            Sin frase baja el archivo en claro: lleva datos de clientes, guardalo en un lugar privado. Con frase, sin
            ella no se puede abrir (ni siquiera nosotros): anotala en un lugar seguro.
          </p>
        </form>
        <div className="space-y-1 border-t border-[var(--line)] pt-3">
          <p className="text-foreground">Copia mensual automática</p>
          {monthly ? (
            <p>
              El día 1 de cada mes GitHub Actions guarda una copia cifrada con la frase{" "}
              <code className={code}>BACKUP_PASSPHRASE</code> (pestaña Actions del repo → «Copia de seguridad mensual»
              → Artifacts). Cada una dura 90 días.
            </p>
          ) : (
            <p className="text-amber-300">
              Falta cargar <code className={code}>BACKUP_PASSPHRASE</code> en Vercel (una frase de {MIN_PASSPHRASE}{" "}
              caracteres o más, guardada también fuera del panel) y redeployar. Sin ella la copia mensual no se hace:
              el repo es público y nunca se guarda en claro.
            </p>
          )}
        </div>
        <div className="space-y-1 border-t border-[var(--line)] pt-3">
          <p className="text-foreground">Restaurar</p>
          <p>
            Desde una compu con el repo y el <code className={code}>.env.local</code> (las variables de Supabase):
          </p>
          <code className="block rounded-lg border border-[var(--line-strong)] bg-[var(--well)] px-3 py-2 font-mono text-[12px] break-all text-foreground">
            RESPALDO_FRASE=&apos;…&apos; node --env-file=.env.local scripts/restore-backup.mjs copia.json
          </code>
          <p>
            Primero muestra qué haría (cuántas filas hay y cuántas faltan) sin tocar nada. Con{" "}
            <code className={code}>--aplicar</code> agrega lo que falta y repone lo cambiado; nunca borra. Con{" "}
            <code className={code}>--tablas=leads,panel_tasks</code> se limita a esas.
          </p>
        </div>
      </div>
    </Card>
  );
}

