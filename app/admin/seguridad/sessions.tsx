"use client";

// «Cerrar todas las sesiones»: pide confirmar con un segundo clic.
import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { Card, btnDanger, btnSecondary } from "../kit";
import { useToast } from "../overlay";
import { closeAllSessions } from "./actions";

export function SessionsCard({ lastCut }: { lastCut: string | null }) {
  const flash = useToast();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  function cut() {
    start(async () => {
      const res = await closeAllSessions();
      setAsking(false);
      if (res.error) flash(res.error, "error");
      else
        flash(
          "Listo: todos los demás dispositivos tienen que volver a entrar.",
          "ok",
        );
    });
  }

  return (
    <Card title="Sesiones" icon={<LogOut size={14} />}>
      <div className="space-y-3 p-4 text-[13px] text-muted">
        <p>
          Cada ingreso dura 7 días en ese dispositivo. Si perdiste el celular,
          entraste desde una compu ajena o creés que alguien más tiene acceso,
          cerrá todas las sesiones: los dos tienen que volver a entrar en todos
          lados. Vos seguís adentro acá.
        </p>
        {lastCut && <p className="text-[12px]">Último corte: {lastCut}.</p>}
        <div className="flex flex-wrap gap-2">
          {asking ? (
            <>
              <button
                type="button"
                onClick={cut}
                disabled={pending}
                className={btnDanger}
              >
                {pending ? "Cerrando…" : "Sí, cerrar todas"}
              </button>
              <button
                type="button"
                onClick={() => setAsking(false)}
                disabled={pending}
                className={btnSecondary}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAsking(true)}
              className={btnSecondary}
            >
              <LogOut size={14} /> Cerrar todas las sesiones
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
