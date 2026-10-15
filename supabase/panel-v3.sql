-- Panel v3: el Registro de cambios con tipos reales. Hasta ahora Finanzas,
-- Cuentas, Contenido, Llamadas y la copia de seguridad se anotaban como
-- «proyecto», así que se mezclaban con el trabajo de los proyectos (y «En vivo»
-- los mostraba en el mapa). Aplicar en el SQL editor de Supabase después de
-- tasks.sql y panel-v2.sql. Se puede correr más de una vez.
--
-- Mientras no se corra, el panel anota lo nuevo como «proyecto» y al leerlo lo
-- reconoce por el texto; esto lo deja bien guardado.

alter table panel_events drop constraint if exists panel_events_kind_check;
alter table panel_events add constraint panel_events_kind_check
  check (kind in ('archivos', 'proyecto', 'pedido', 'tarea', 'finanzas', 'cuentas', 'contenido', 'llamadas', 'seguridad', 'clientes', 'mantenimiento'));

-- Los viejos, por su texto. Son las mismas reglas que kindOf() en
-- lib/admin/event-shared.ts: si se cambia una, cambiar la otra.
update panel_events set kind = 'finanzas'
where kind = 'proyecto'
  and text ~ '^((cargó|editó|borró) un (costo|ingreso)|marcó como (pagado|cobrado)|(agregó|actualizó|quitó) la herramienta |(registró|editó|borró) un cobro)';

update panel_events set kind = 'cuentas'
where kind = 'proyecto' and text ~ ' (en|de) Cuentas$';

update panel_events set kind = 'contenido'
where kind = 'proyecto' and text ~ ' en Instagram$';

update panel_events set kind = 'llamadas'
where kind = 'proyecto' and text ~ '^llamó a .+ por Meet$';

update panel_events set kind = 'seguridad'
where kind = 'proyecto' and text ~ '^descargó una copia de seguridad';

update panel_events set kind = 'clientes'
where kind = 'proyecto' and text ~ '^((creó|editó|borró) el cliente «|(vinculó|desvinculó) el proyecto (al|del) cliente «)';

update panel_events set kind = 'mantenimiento'
where kind = 'proyecto' and text ~ '(plan de mantenimiento|^(anotó|borró) el pedido de mantenimiento «|^pasó el pedido «.+» a |^actualizó el pedido «)';

-- Para el filtro por tipo del Registro.
create index if not exists panel_events_kind_idx on panel_events (kind, created_at desc);
