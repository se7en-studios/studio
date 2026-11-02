-- Radar de prospectos compartido: el estado, quién contactó y la nota de cada
-- prospecto viven acá y no en el navegador de cada uno, así Franco y Federico
-- ven lo mismo. Los prospectos en sí salen de data/prospects.ts (lead_id es su
-- id, sin FK). Aplicar en el SQL editor de Supabase. Se puede correr más de una vez.

create table if not exists prospect_state (
  lead_id text primary key,
  status text not null default 'nuevo'
    check (status in ('nuevo', 'contactado', 'en_charla', 'ganado', 'descartado', 'numero_equivocado')),
  -- Quién lo contactó primero y cuándo; se completa la primera vez que sale de «nuevo».
  contacted_by text check (contacted_by in ('franco', 'federico')),
  contacted_at timestamptz,
  note text not null default '' check (char_length(note) <= 2000),
  note_by text check (note_by in ('franco', 'federico')),
  note_at timestamptz,
  updated_by text check (updated_by in ('franco', 'federico')),
  updated_at timestamptz not null default now()
);

-- Igual que el resto: RLS sin policies, sólo el servidor con la service role.
alter table prospect_state enable row level security;
