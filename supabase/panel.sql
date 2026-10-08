-- Panel del estudio: proyectos internos, archivos y el feed de cambios.
-- Aplicar pegando este archivo en el SQL editor de Supabase (después de
-- leads.sql). Se puede correr más de una vez.

-- Proyectos que no son casos de la web (los casos salen de data/projects.ts).
create table if not exists panel_projects (
  slug text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  category text not null default '',
  url text not null default '',
  accent text not null default '#ff4d2e',
  created_by text check (created_by in ('franco', 'federico'))
);

-- Un archivo subido a Storage. `project_slug` puede ser un caso de
-- data/projects.ts o una fila de panel_projects, por eso no lleva FK.
create table if not exists panel_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null,
  folder text not null
    check (folder in ('diseno', 'entregables', 'contenido', 'documentos', 'referencias')),
  path text not null unique,
  name text not null,
  mime text not null default '',
  size bigint not null default 0,
  uploaded_by text check (uploaded_by in ('franco', 'federico'))
);

create index if not exists panel_files_project_idx on panel_files (project_slug, created_at desc);

-- Lo que muestra Cambios: una fila por cosa que pasó en el panel.
create table if not exists panel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text check (actor in ('franco', 'federico')),
  kind text not null check (kind in ('archivos', 'proyecto', 'pedido', 'tarea')),
  text text not null,
  project_slug text,
  -- Rutas de Storage para mostrar miniaturas en el feed.
  paths text[] not null default '{}'
);

create index if not exists panel_events_created_at_idx on panel_events (created_at desc);

-- Igual que leads: RLS activo y sin policies. Sólo el servidor, con la
-- service role key, lee y escribe.
alter table panel_projects enable row level security;
alter table panel_files enable row level security;
alter table panel_events enable row level security;

-- Bucket privado. Nada es público: el servidor firma una URL por archivo cada
-- vez que se muestra. 50 MB es el máximo por archivo del plan Free.
insert into storage.buckets (id, name, public, file_size_limit)
values ('panel', 'panel', false, 52428800)
on conflict (id) do nothing;
