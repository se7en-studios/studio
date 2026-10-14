-- Día a día v1: tareas «esperando al cliente» y tareas que se repiten.
-- Aplicar en el SQL editor de Supabase después de tasks.sql. Se puede correr
-- más de una vez. Sin esto el panel sigue andando: sólo no se pueden marcar
-- tareas como «esperando» ni hacerlas repetir.

-- La pelota está del lado del cliente: la tarea no cuenta como vencida.
alter table panel_tasks add column if not exists waiting boolean not null default false;

-- Al completar una que se repite, el panel crea la siguiente con la fecha corrida.
alter table panel_tasks add column if not exists recur text;
alter table panel_tasks drop constraint if exists panel_tasks_recur_check;
alter table panel_tasks add constraint panel_tasks_recur_check
  check (recur is null or recur in ('semanal', 'mensual'));
