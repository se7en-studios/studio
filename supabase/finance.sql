-- Finanzas del estudio: ingresos y costos en pesos o dólares. Aplicar pegando
-- este archivo en el SQL editor de Supabase (después de payments.sql). Se puede
-- correr más de una vez.
--
-- Los cobros de los proyectos siguen en panel_payments (USD) y entran solos a
-- Finanzas como ingresos: acá sólo va lo que no es un cobro de proyecto (otros
-- ingresos y todos los costos).
create table if not exists panel_finance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('ingreso', 'costo')),
  occurred_on date not null,
  -- Moneda en la que se cargó el monto.
  currency text not null check (currency in ('ARS', 'USD')),
  amount numeric(14, 2) not null check (amount > 0 and amount <= 1000000000),
  -- Pesos por dólar al cargar. Con esto se calcula el equivalente en la otra moneda.
  fx numeric(12, 2) not null check (fx > 0 and fx <= 100000),
  category text not null default 'otros' check (char_length(category) <= 40),
  description text not null default '' check (char_length(description) <= 200),
  -- Sin FK, igual que panel_payments: sirve para casos de la web y proyectos del panel.
  project_slug text check (project_slug is null or project_slug ~ '^[a-z0-9-]{1,64}$'),
  -- Se repite todos los meses desde occurred_on hasta `until` (o sin fin).
  recurring boolean not null default false,
  until date,
  created_by text check (created_by in ('franco', 'federico'))
);

create index if not exists panel_finance_date_idx on panel_finance (occurred_on desc);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_finance enable row level security;
