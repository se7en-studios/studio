-- Mantenimiento como módulo: el plan (abono) de cada proyecto, los cobros
-- mensuales que ya se generaron y la cola de pedidos de los clientes. Aplicar
-- en el SQL editor de Supabase después de finance-v2.sql. Se puede correr más
-- de una vez.
--
-- Cada mes el panel genera, por plan activo, un ingreso PENDIENTE en Finanzas
-- (panel_finance, categoría «mantenimiento», con el proyecto y la fecha del
-- día de cobro). Nunca lo da por cobrado: se marca como cobrado en Finanzas.

-- Un plan por proyecto (caso de data/projects.ts o fila de panel_projects: sin FK, como panel_finance).
create table if not exists panel_maintenance_plans (
  project_slug text primary key check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  amount numeric(14, 2) not null check (amount > 0 and amount <= 1000000000),
  currency text not null check (currency in ('ARS', 'USD')),
  -- Día del mes en que se cobra (hasta 28, para que exista en todos los meses).
  billing_day int not null default 1 check (billing_day between 1 and 28),
  includes text not null default '' check (char_length(includes) <= 500),
  -- Horas por mes incluidas en el abono; null = sin tope.
  hours_included numeric(6, 1) check (hours_included is null or (hours_included >= 0 and hours_included <= 999)),
  active boolean not null default true,
  start_date date not null default current_date,
  -- Desde cuándo genera cobros: el alta o la última vez que se reactivó. Así
  -- pausar y reactivar no genera los meses en pausa.
  billing_from date not null default current_date,
  -- Quién cobra el abono (todo se divide 50/50 entre los socios).
  owner text not null default 'ambos' check (owner in ('ambos', 'franco', 'federico')),
  -- Vencimiento del dominio cargado a mano (si el chequeo diario no lo pudo averiguar).
  domain_expires_on date,
  updated_by text check (updated_by in ('franco', 'federico'))
);

-- Los cobros mensuales ya generados: uno por proyecto y mes, nunca dos. Si se
-- borra el ingreso en Finanzas no se vuelve a generar.
create table if not exists panel_maintenance_charges (
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  finance_id uuid,
  created_at timestamptz not null default now(),
  primary key (project_slug, period)
);

-- Cola de pedidos de los clientes (cambios, arreglos, contenido nuevo…).
create table if not exists panel_maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 4000),
  priority text not null default 'media' check (priority in ('urgente', 'alta', 'media', 'baja')),
  status text not null default 'nuevo' check (status in ('nuevo', 'en_curso', 'esperando', 'hecho')),
  -- Tiempo usado, en minutos.
  minutes int not null default 0 check (minutes between 0 and 100000),
  due date,
  done_at timestamptz,
  created_by text check (created_by in ('franco', 'federico'))
);

create index if not exists panel_maintenance_requests_open_idx
  on panel_maintenance_requests (project_slug, created_at desc);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_maintenance_plans enable row level security;
alter table panel_maintenance_charges enable row level security;
alter table panel_maintenance_requests enable row level security;

-- Para deshacerlo: drop table panel_maintenance_requests, panel_maintenance_charges, panel_maintenance_plans;
-- (los ingresos pendientes ya generados quedan en Finanzas).
