-- Tareas del panel: quién hace qué y para cuándo. Se pueden colgar de un
-- pedido (seguimientos) o de un proyecto. Aplicar en el SQL editor de
-- Supabase después de leads.sql y panel.sql. Se puede correr más de una vez.

create table if not exists panel_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '',
  -- null = sin asignar.
  assignee text check (assignee in ('franco', 'federico')),
  due date,
  priority text not null default 'media' check (priority in ('alta', 'media', 'baja')),
  done_at timestamptz,
  lead_id uuid references leads (id) on delete set null,
  -- Caso de data/projects.ts o fila de panel_projects: sin FK, igual que panel_files.
  project_slug text,
  created_by text check (created_by in ('franco', 'federico'))
);

create index if not exists panel_tasks_open_idx on panel_tasks (done_at, due);
create index if not exists panel_tasks_lead_idx on panel_tasks (lead_id) where lead_id is not null;

-- Igual que el resto: RLS sin policies, sólo el servidor con la service role.
alter table panel_tasks enable row level security;

-- El feed de Cambios también cuenta las tareas.
alter table panel_events drop constraint if exists panel_events_kind_check;
alter table panel_events add constraint panel_events_kind_check
  check (kind in ('archivos', 'proyecto', 'pedido', 'tarea'));
