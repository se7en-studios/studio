-- Capturas automáticas de los sitios de cada proyecto, para la tele de las
-- salas de «En vivo» (/admin/oficinas). Las saca .github/workflows/capturas.yml
-- todas las mañanas y las sube por /api/cron/capturas. Aplicar en el SQL editor
-- de Supabase después de panel.sql. Se puede correr más de una vez.

-- La última captura de cada proyecto (la anterior se borra al subir la nueva).
create table if not exists panel_site_captures (
  -- Caso de data/projects.ts o fila de panel_projects: sin FK, igual que panel_files.
  project_slug text primary key check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  -- Ruta dentro del bucket «capturas». Cambia en cada captura, así nadie ve una vieja cacheada.
  path text not null,
  url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  captured_at timestamptz not null default now()
);

-- Igual que el resto: RLS activo y sin policies. Sólo el servidor, con la
-- service role key, lee y escribe.
alter table panel_site_captures enable row level security;

-- Bucket público, a diferencia de «panel»: son capturas de sitios ya
-- publicados, y así el mapa las puede dibujar en el canvas sin firmar una URL
-- por vez. Sólo JPG, 5 MB como máximo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capturas', 'capturas', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- Para deshacerlo: drop table panel_site_captures; y borrar el bucket «capturas» desde Storage.
