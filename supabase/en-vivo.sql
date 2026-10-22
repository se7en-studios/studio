-- Lo que pasa en la oficina de «En vivo» de la landing, para saber si sirve:
-- cuántos entran, cuánto se quedan, si se cruzan con Franco o Federico,
-- cuántos gestos se mandan, cuántos les avisan y cuántos terminan escribiendo
-- (ver lib/en-vivo-medicion.ts). Una fila por cosa que pasa, con el id corto
-- de la visita del día (un hash de la IP que cambia todos los días, como en
-- site_visitors; nunca la IP). Los números se ven en el panel, en En vivo.
-- Aplicar en el SQL editor de Supabase. Se puede correr más de una vez.

create table if not exists en_vivo_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  visitor text not null check (visitor ~ '^[a-f0-9]{10}$'),
  kind text not null check (kind in ('abrir', 'salir', 'socio', 'gesto', 'aviso', 'whatsapp', 'contacto')),
  detail text check (char_length(detail) <= 24),
  value int check (value between 0 and 86400)
);

create index if not exists en_vivo_events_at on en_vivo_events (at);

-- Igual que el resto: RLS activo y sin policies. Sólo el servidor, con la
-- service role key, lee y escribe.
alter table en_vivo_events enable row level security;

-- Para deshacerlo: drop table en_vivo_events;
