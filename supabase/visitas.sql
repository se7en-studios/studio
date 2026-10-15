-- Quién está mirando la landing ahora, para «En vivo»: cada visita aparece
-- como un muñeco que pasea por las salas. Una fila por visita: un hash de la
-- IP que cambia todos los días (nunca la IP) y la última señal. Las filas de
-- más de 10 minutos se borran solas en cada señal.
-- Aplicar en el SQL editor de Supabase. Se puede correr más de una vez.

create table if not exists site_visitors (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  last_seen timestamptz not null default now()
);

-- Si la visita es uno de los dos (con la sesión del panel abierta), quién: así
-- aparece con su muñeco y su nombre en vez de uno al azar.
alter table site_visitors add column if not exists who text check (who in ('franco', 'federico'));

create index if not exists site_visitors_last_seen on site_visitors (last_seen);

-- Igual que el resto: RLS activo y sin policies. Sólo el servidor, con la
-- service role key, lee y escribe; la landing ve un id corto de cada visita.
alter table site_visitors enable row level security;

-- Para deshacerlo: drop table site_visitors;
