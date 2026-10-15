// Verifica las fechas, los estados y las plantillas de las tareas:
// node scripts/check-tasks.mjs
import assert from "node:assert/strict";

const { bucket, nextDue, cleanInput, dueLabel, TASK_TEMPLATES, isTemplate, templateTasks } = await import("../lib/admin/task-shared.ts");


const today = "2026-10-14";

// Urgencia: vencidas, hoy, semana, más adelante, sin fecha y hechas.
assert.equal(bucket({ due: "2026-10-13", done_at: null }, today), "vencidas");
assert.equal(bucket({ due: "2026-09-01", done_at: null }, today), "vencidas");
assert.equal(bucket({ due: today, done_at: null }, today), "hoy");
assert.equal(bucket({ due: "2026-10-21", done_at: null }, today), "semana");
assert.equal(bucket({ due: "2026-10-22", done_at: null }, today), "despues");
assert.equal(bucket({ due: null, done_at: null }, today), "sinfecha");
assert.equal(bucket({ due: "2026-10-01", done_at: "2026-10-02T10:00:00Z" }, today), "hechas");
// Esperando al cliente: no cuenta como vencida; hecha gana.
assert.equal(bucket({ due: "2026-10-01", done_at: null, waiting: true }, today), "esperando");
assert.equal(bucket({ due: "2026-10-01", done_at: "2026-10-02T10:00:00Z", waiting: true }, today), "hechas");
assert.equal(dueLabel("2026-10-11", today), "hace 3 días");
assert.equal(dueLabel("2026-10-15", today), "mañana");

// Repetición: un paso desde la fecha, sin quedar vencida.
assert.equal(nextDue("2026-10-14", "semanal", today), "2026-10-21");
assert.equal(nextDue("2026-10-10", "semanal", today), "2026-10-17");
assert.equal(nextDue("2026-09-20", "semanal", today), "2026-10-18"); // atrasada: salta a la próxima que no pasó
assert.equal(nextDue(null, "semanal", today), "2026-10-21");
assert.equal(nextDue("2026-10-14", "mensual", today), "2026-11-14");
assert.equal(nextDue("2026-01-31", "mensual", "2026-01-31"), "2026-02-28"); // recorta al fin de mes
assert.equal(nextDue("2026-12-15", "mensual", "2026-12-15"), "2027-01-15");
assert.equal(nextDue("2026-08-31", "mensual", today), "2026-10-31"); // conserva el día 31

// Validación de lo nuevo.
assert.deepEqual(cleanInput({ waiting: true, recur: "mensual" }, ["franco"]), { waiting: true, recur: "mensual" });
assert.deepEqual(cleanInput({ recur: null }, []), { recur: null });
assert.throws(() => cleanInput({ recur: "diaria" }, []), /Repetición/);

// Plantillas: todas arrancan con el kickoff y cuelgan del proyecto.
for (const id of Object.keys(TASK_TEMPLATES)) {
  assert.ok(isTemplate(id));
  const ts = templateTasks(id, "muzzaga", Date.parse("2026-10-14T15:00:00Z"));
  assert.ok(ts.length >= 8);
  assert.ok(ts.some((t) => /dominio/i.test(t.title)) && ts.some((t) => /hosting/i.test(t.title)));
  assert.ok(ts.some((t) => /accesos/i.test(t.title)) && ts.some((t) => /analytics/i.test(t.title)));
  assert.ok(ts.every((t) => t.project_slug === "muzzaga" && t.due > today && t.title.length <= 200));
}
assert.ok(!isTemplate("toString"));
assert.ok(!isTemplate(""));

console.log("check-tasks: ok");
