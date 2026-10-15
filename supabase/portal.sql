-- Portal del cliente (/portal): el link de acceso de cada cliente, las
-- aprobaciones que pide el estudio (con el registro de cada decisión), el flag
-- «lo ve el cliente» de los archivos y el origen de los pedidos de
-- mantenimiento. Aplicar en el SQL editor de Supabase después de clients.sql y
-- maintenance.sql. Se puede correr más de una vez.
--
-- Todo es privado por defecto: un archivo no se muestra hasta marcarlo, y el
-- portal sólo lee lo de los proyectos vinculados al cliente de la sesión.

-- Un link por cliente. Se guarda el sha256 del token, nunca el token: quien lea
-- la tabla no puede entrar al portal. Regenerar = borrar y crear (id nuevo), así
-- las sesiones abiertas con el link viejo dejan de valer. Revocar = borrar.
create table if not exists panel_portal_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references panel_clients (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  created_by text check (created_by in ('franco', 'federico')),
  last_used_at timestamptz
);

-- Lo que el estudio le pide aprobar al cliente (un diseño, un texto, una
-- entrega). Cada «pedir cambios» y nueva versión es una ronda más.
create table if not exists panel_approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  link text not null default '' check (char_length(link) <= 500),
  file_id uuid references panel_files (id) on delete set null,
  round int not null default 1 check (round between 1 and 99),
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'cambios')),
  requested_by text check (requested_by in ('franco', 'federico'))
);

create index if not exists panel_approvals_project_idx on panel_approvals (project_slug, created_at desc);

-- El registro: quién decidió (el nombre que escribió y el cliente de la
-- sesión), cuándo, desde qué IP y en qué ronda. No se edita ni se borra desde el
-- panel; se va sólo si se borra la aprobación entera.
create table if not exists panel_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  approval_id uuid not null references panel_approvals (id) on delete cascade,
  round int not null check (round between 1 and 99),
  decision text not null check (decision in ('aprobado', 'cambios')),
  comment text not null default '' check (char_length(comment) <= 4000),
  signer text not null check (char_length(signer) between 2 and 120),
  client_id uuid references panel_clients (id) on delete set null,
  ip text not null default '' check (char_length(ip) <= 64),
  user_agent text not null default '' check (char_length(user_agent) <= 300)
);

create index if not exists panel_approval_decisions_idx on panel_approval_decisions (approval_id, created_at);

-- Archivos: el cliente sólo ve los marcados.
alter table panel_files add column if not exists client_visible boolean not null default false;

-- Pedidos de mantenimiento: los que crea el cliente desde el portal.
alter table panel_maintenance_requests
  add column if not exists source text not null default 'panel' check (source in ('panel', 'cliente'));

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_portal_links enable row level security;
alter table panel_approvals enable row level security;
alter table panel_approval_decisions enable row level security;

-- Para deshacerlo: drop table panel_approval_decisions, panel_approvals, panel_portal_links;
-- alter table panel_files drop column client_visible;
-- alter table panel_maintenance_requests drop column source;
