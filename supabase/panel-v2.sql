-- Panel v2: estado de cada proyecto, mensajes entre el equipo y un registro
-- de cambios con el antes y el después. Aplicar en el SQL editor de Supabase
-- después de leads.sql, panel.sql, tasks.sql y crm.sql. Se puede correr más de
-- una vez.

-- --- Proyectos ---------------------------------------------------------------
-- Estado de gestión de cada proyecto: sirve para los casos de data/projects.ts
-- y para los de panel_projects, por eso va por slug y sin FK.
create table if not exists panel_project_state (
  slug text primary key,
  updated_at timestamptz not null default now(),
  updated_by text check (updated_by in ('franco', 'federico')),
  status text not null default 'descubrimiento'
    check (status in ('descubrimiento', 'diseno', 'desarrollo', 'revision', 'entregado', 'mantenimiento', 'pausado')),
  owner text check (owner in ('franco', 'federico')),
  client text not null default '' check (char_length(client) <= 120),
  lead_id uuid references leads (id) on delete set null,
  start_date date,
  due date,
  progress int not null default 0 check (progress between 0 and 100),
  -- USD.
  budget numeric(12, 2) check (budget is null or budget >= 0),
  notes text not null default '' check (char_length(notes) <= 10000)
);

-- --- Mensajes ----------------------------------------------------------------
-- Un canal es 'general', 'p:<slug>' (un proyecto) o 'l:<uuid>' (un pedido).
create table if not exists panel_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  channel text not null check (channel ~ '^(general|p:[a-z0-9-]{1,64}|l:[0-9a-f-]{36})$'),
  author text not null check (author in ('franco', 'federico')),
  body text not null check (char_length(body) between 1 and 4000)
);

create index if not exists panel_messages_channel_idx on panel_messages (channel, created_at desc);
create index if not exists panel_messages_created_idx on panel_messages (created_at desc);

-- Hasta dónde leyó cada uno cada canal: de acá salen los no leídos.
create table if not exists panel_reads (
  who text not null check (who in ('franco', 'federico')),
  channel text not null,
  last_read_at timestamptz not null default now(),
  primary key (who, channel)
);

-- --- Registro de cambios -------------------------------------------------------
-- Cada línea del feed puede llevar el pedido al que se refiere y la lista de
-- campos que cambiaron: [{ "field": "status", "label": "Etapa", "before": "Nuevo", "after": "Contactado" }].
alter table panel_events add column if not exists lead_id uuid references leads (id) on delete set null;
alter table panel_events add column if not exists changes jsonb not null default '[]'::jsonb;
create index if not exists panel_events_lead_idx on panel_events (lead_id, created_at desc) where lead_id is not null;
create index if not exists panel_events_project_idx on panel_events (project_slug, created_at desc) where project_slug is not null;
create index if not exists panel_events_actor_idx on panel_events (actor, created_at desc);

-- Igual que el resto: RLS activo y sin policies. Sólo el servidor, con la
-- service role key, lee y escribe.
alter table panel_project_state enable row level security;
alter table panel_messages enable row level security;
alter table panel_reads enable row level security;
