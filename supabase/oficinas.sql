-- «En vivo» (Oficinas): cuándo entró cada uno a cada sala del mapa. De acá
-- sale cuánto se apagó cada sala. Aplicar en el SQL editor de Supabase después
-- de panel.sql y panel-v2.sql. Se puede correr más de una vez.
--
-- No se escribe en panel_reads: eso marcaría como leído el chat del proyecto
-- sin que nadie lo haya visto.

create table if not exists panel_room_visits (
  who text not null check (who in ('franco', 'federico')),
  -- Caso de data/projects.ts o fila de panel_projects: sin FK, igual que
  -- panel_files y panel_project_state. Al borrar un proyecto se borra a mano.
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  visited_at timestamptz not null default now(),
  primary key (who, project_slug)
);

-- Igual que el resto: RLS activo y sin policies. Sólo el servidor, con la
-- service role key, lee y escribe.
alter table panel_room_visits enable row level security;

-- Para deshacerlo: drop table panel_room_visits;
