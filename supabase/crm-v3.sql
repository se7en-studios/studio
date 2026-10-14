-- CRM v3: lo que faltaba para cerrar bien un pedido y para que lo que llega
-- del sitio se enganche al pedido que ya existe. Aplicar en el SQL editor de
-- Supabase después de crm.sql y crm-v2.sql. Se puede correr más de una vez.
--
--   lost_at         cuándo pasó a Perdido (el panel la guarda; sirve para «para retomar»)
--   lost_reason     motivo corto de pérdida (precio, plazo, otro_proveedor, sin_respuesta,
--                   pospuesto, no_cliente, otro)
--   lost_note       el detalle en texto libre
--   expected_close  fecha de cierre prevista, para el pipeline
--   meeting_at      reunión agendada (la reserva del sitio la guarda acá, no en «plazo»)
--   kickoff         la ficha de kickoff que mandó el cliente desde /kickoff
--
-- Mientras no se corra, el panel anda igual: no muestra ni guarda estos datos,
-- y los formularios del sitio guardan el pedido sin ellos.
alter table leads add column if not exists lost_at timestamptz;
alter table leads add column if not exists lost_reason text;
alter table leads add column if not exists lost_note text;
alter table leads add column if not exists expected_close date;
alter table leads add column if not exists meeting_at timestamptz;
alter table leads add column if not exists kickoff text;

-- Los que ya están perdidos: su último cambio, que es lo mejor que hay.
update leads set lost_at = updated_at where status = 'perdido' and lost_at is null;

-- Para buscar rápido un pedido por email al recibir un kickoff o una reserva,
-- y para listar las reuniones próximas.
create index if not exists leads_email_idx on leads (lower(email)) where email <> '';
create index if not exists leads_meeting_at_idx on leads (meeting_at) where meeting_at is not null;
