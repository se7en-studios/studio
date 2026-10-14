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

-- Adjuntos de los mensajes: [{ "path", "name", "size", "mime" }]. Los archivos
-- van al bucket «panel», en _chat/<canal>/, subidos directo desde el navegador.
alter table panel_messages add column if not exists attachments jsonb not null default '[]'::jsonb;
-- Un mensaje puede ser sólo un adjunto, sin texto.
alter table panel_messages drop constraint if exists panel_messages_body_check;
alter table panel_messages add constraint panel_messages_body_check
  check (char_length(body) <= 4000 and (char_length(body) > 0 or jsonb_array_length(attachments) > 0));
-- Para buscar dentro de los mensajes.
create extension if not exists pg_trgm;
create index if not exists panel_messages_body_trgm_idx on panel_messages using gin (body gin_trgm_ops);
