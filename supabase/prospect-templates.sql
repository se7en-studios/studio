-- Plantillas del primer mensaje a un prospecto, compartidas entre Franco y
-- Federico. La primera vez que se abre el radar se cargan unas sugeridas
-- (lib/admin/prospect-template-shared.ts). Aplicar en el SQL editor de
-- Supabase. Se puede correr más de una vez.

create table if not exists prospect_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000),
  active boolean not null default true,
  created_by text check (created_by in ('franco', 'federico')),
  updated_by text check (updated_by in ('franco', 'federico')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Igual que el resto: RLS sin policies, sólo el servidor con la service role.
alter table prospect_templates enable row level security;
