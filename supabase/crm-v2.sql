-- CRM v2: la fecha en que se ganó cada pedido. «Ganado este mes» usaba
-- updated_at, que se mueve con cualquier edición (una nota, el teléfono) y
-- pasaba pedidos viejos al mes actual. Aplicar en el SQL editor de Supabase
-- después de crm.sql y panel-v2.sql. Se puede correr más de una vez.
--
-- El panel la guarda al pasar un pedido a Ganado y la borra si sale de Ganado.
-- Mientras no se corra, sigue usando updated_at.
alter table leads add column if not exists won_at timestamptz;

-- Los que ya están ganados: la última vez que alguien los movió a Ganado según
-- el Registro y, si no quedó anotado, su último cambio.
update leads l
set won_at = coalesce(
  (select max(e.created_at)
     from panel_events e
    where e.lead_id = l.id and e.kind = 'pedido' and e.text ~ ' a Ganado$'),
  l.updated_at
)
where l.status = 'ganado' and l.won_at is null;
