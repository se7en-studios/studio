-- Finanzas v2: reparto entre socios, pagos pendientes y herramientas con fecha
-- de renovación. Aplicar pegando este archivo en el SQL editor de Supabase
-- (después de finance.sql). Se puede correr más de una vez.

-- De quién es el movimiento: de uno de los socios o de los dos (se parte 50/50).
alter table panel_finance
  add column if not exists owner text not null default 'ambos'
  check (owner in ('ambos', 'franco', 'federico'));

-- «pendiente» = todavía no se cobró (o no se pagó): no cuenta en los totales
-- hasta que se marca como pagado.
alter table panel_finance
  add column if not exists status text not null default 'pagado'
  check (status in ('pagado', 'pendiente'));

-- Herramientas y suscripciones (Claude, Supabase, Vercel…): cuánto cuestan,
-- cada cuánto se pagan y cuándo renuevan. La próxima renovación se calcula sola
-- a partir de renews_on y el ciclo.
create table if not exists panel_tools (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 60),
  amount numeric(14, 2) not null check (amount >= 0 and amount <= 1000000000),
  currency text not null check (currency in ('ARS', 'USD')),
  cycle text not null check (cycle in ('mensual', 'anual')),
  renews_on date not null,
  owner text not null default 'ambos' check (owner in ('ambos', 'franco', 'federico')),
  notes text not null default '' check (char_length(notes) <= 200)
);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_tools enable row level security;
