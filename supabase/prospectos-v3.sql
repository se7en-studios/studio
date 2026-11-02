-- Radar de prospectos, parte 3: prospectos cargados desde el panel y el vínculo
-- con Pedidos. Aplicar en el SQL editor de Supabase después de prospectos.sql y
-- de leads.sql. Se puede correr más de una vez.

-- Prospectos que se cargan a mano (los demás salen de data/prospects.ts).
create table if not exists prospect_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  city text not null check (char_length(city) between 1 and 60),
  province text not null default '' check (char_length(province) <= 60),
  category text not null default '' check (char_length(category) <= 80),
  address text not null default '' check (char_length(address) <= 200),
  phone text not null check (char_length(phone) between 6 and 40),
  current_site text not null default '' check (char_length(current_site) <= 200),
  website_status text not null default 'Sin sitio web propio' check (char_length(website_status) <= 80),
  pain_point text not null default '' check (char_length(pain_point) <= 500),
  recommended_solution text not null default '' check (char_length(recommended_solution) <= 500),
  estimated_budget_usd integer not null default 1000 check (estimated_budget_usd between 0 and 1000000),
  created_by text check (created_by in ('franco', 'federico')),
  created_at timestamptz not null default now()
);

-- Igual que el resto: RLS sin policies, sólo el servidor con la service role.
alter table prospect_leads enable row level security;

-- El pedido que se creó a partir de un prospecto (para no crearlo dos veces).
alter table prospect_state add column if not exists pedido_id uuid references leads (id) on delete set null;
