-- Quién está conectado al panel, para «En vivo» en la landing: si alguno de
-- los dos está, su muñeco aparece trabajando (en su escritorio o en la sala del
-- proyecto que tiene abierto); si no hay nadie, un guía recorre las salas.
-- El panel manda una señal cada minuto. Aplicar en el SQL editor de Supabase
-- después de panel.sql. Se puede correr más de una vez.

create table if not exists panel_presence (
  who text primary key check (who in ('franco', 'federico')),
  last_seen timestamptz not null default now(),
  -- El proyecto que tiene abierto (en Proyectos o en el mapa). null = en el panel, en su escritorio.
  project_slug text check (project_slug ~ '^[a-z0-9-]{1,64}$')
);

-- Igual que el resto: RLS activo y sin policies. Sólo el servidor, con la
-- service role key, lee y escribe. La landing pregunta por /api/en-vivo, que
-- devuelve sólo quién está y, si es un caso de la web, en qué sala.
alter table panel_presence enable row level security;

-- Para deshacerlo: drop table panel_presence;
