-- Cobros de cada proyecto: seña, saldo, cuotas. El monto acordado sigue en
-- panel_project_state.budget; lo cobrado es la suma de estas filas. Aplicar
-- en el SQL editor de Supabase después de panel-v2.sql. Se puede correr más
-- de una vez.
--
-- Va por slug y sin FK, igual que panel_project_state: sirve para los casos de
-- data/projects.ts y para los de panel_projects. Al borrar un proyecto del
-- panel, removeProject borra sus cobros.
create table if not exists panel_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  paid_on date not null,
  -- USD.
  amount numeric(12, 2) not null check (amount > 0 and amount <= 10000000),
  note text not null default '' check (char_length(note) <= 200),
  created_by text check (created_by in ('franco', 'federico'))
);

create index if not exists panel_payments_project_idx on panel_payments (project_slug, paid_on desc);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_payments enable row level security;
