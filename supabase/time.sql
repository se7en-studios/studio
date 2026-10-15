-- Horas livianas: los tramos de trabajo de cada socio en un proyecto o en un
-- pedido de mantenimiento. Un tramo se abre con el cronómetro (ended_at null
-- mientras corre) o se carga a mano (fecha + minutos). De acá salen las horas de
-- cada abono y la tarifa efectiva por hora de Números. Aplicar en el SQL editor
-- de Supabase. Se puede correr más de una vez.

create table if not exists panel_time (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  who text not null check (who in ('franco', 'federico')),
  -- Caso de data/projects.ts o fila de panel_projects: sin FK, como panel_finance.
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  -- Pedido de mantenimiento (panel_maintenance_requests.id), si el tramo es de uno.
  -- Sin FK para no depender de maintenance.sql: si se borra el pedido, el tramo
  -- queda como tiempo del proyecto.
  maintenance_request_id uuid,
  started_at timestamptz not null default now(),
  -- null = el cronómetro está corriendo.
  ended_at timestamptz,
  -- Duración en minutos; se fija al frenar o al cargarlo a mano.
  minutes int check (minutes is null or minutes between 0 and 1440),
  note text not null default '' check (char_length(note) <= 500),
  check ((ended_at is null) = (minutes is null))
);

-- Un solo cronómetro corriendo por persona.
create unique index if not exists panel_time_running_idx
  on panel_time (who) where ended_at is null;

create index if not exists panel_time_project_idx
  on panel_time (project_slug, started_at desc);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_time enable row level security;

-- Para deshacerlo: drop table panel_time;
-- (los minutos cargados a mano en los pedidos antes de esto siguen en panel_maintenance_requests.minutes).
