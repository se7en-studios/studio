-- CRM del panel: teléfono y monto acordado en cada pedido, y el historial de
-- contactos (llamadas, mails, WhatsApp, reuniones, notas). Aplicar en el SQL
-- editor de Supabase después de leads.sql y panel.sql. Se puede correr más de
-- una vez.

alter table leads add column if not exists phone text not null default '';
-- Monto acordado en USD. Si está, pisa al rango de presupuesto del formulario
-- en «Valor en juego» y «Ganado».
alter table leads add column if not exists value numeric(12, 2);
alter table leads drop constraint if exists leads_value_check;
alter table leads add constraint leads_value_check check (value is null or value >= 0);

create table if not exists panel_lead_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references leads (id) on delete cascade,
  kind text not null check (kind in ('llamada', 'mail', 'whatsapp', 'reunion', 'nota')),
  text text not null default '' check (char_length(text) <= 2000),
  -- Cuándo pasó: puede cargarse después (por ejemplo, una llamada de ayer).
  at timestamptz not null default now(),
  actor text check (actor in ('franco', 'federico'))
);

create index if not exists panel_lead_activity_lead_idx on panel_lead_activity (lead_id, at desc);

-- Igual que el resto: RLS sin policies, sólo el servidor con la service role.
alter table panel_lead_activity enable row level security;
