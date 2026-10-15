-- Propuestas online: cada pedido puede tener varias versiones de propuesta
-- (alcance, plazos, opcionales con precio, validez, moneda y forma de pago) y
-- una vigente. El cliente la abre en /propuesta/<token>, tilda opcionales y la
-- acepta o la rechaza. La aceptación queda guardada como prueba (fecha y hora,
-- IP, navegador, nombre, email y el SHA-256 del contenido exacto aceptado).
-- Aplicar en el SQL editor de Supabase después de schema.sql (leads) y
-- rate-limit.sql. Se puede correr más de una vez.
--
-- El link no se guarda: se guarda el sha256 del token (token_hash) para
-- buscarlo, y un `nonce` al azar del que el servidor vuelve a derivar el link
-- (HMAC con ADMIN_SESSION_SECRET) para «copiar link». Un volcado de la base no
-- alcanza para abrir ni aceptar propuestas.

create table if not exists panel_proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  version int not null check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text check (created_by in ('franco', 'federico')),
  -- «vencida» no se guarda: sale de valid_until.
  status text not null default 'borrador' check (status in ('borrador', 'enviada', 'vista', 'aceptada', 'rechazada')),
  nonce text not null check (char_length(nonce) between 16 and 64),
  token_hash text not null unique check (char_length(token_hash) = 64),
  title text not null check (char_length(title) between 1 and 120),
  intro text not null default '' check (char_length(intro) <= 2000),
  items jsonb not null default '[]',
  optionals jsonb not null default '[]',
  base_amount numeric(14, 2) not null check (base_amount > 0),
  currency text not null check (currency in ('USD', 'ARS')),
  days int not null check (days between 1 and 365),
  valid_until date not null,
  payment jsonb not null,
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  -- Anulada a mano o reemplazada por otra versión enviada: el link deja de servir.
  revoked_at timestamptz,
  -- Al aceptar: los opcionales tildados, el total y la prueba.
  selected jsonb,
  total numeric(14, 2),
  acceptance jsonb,
  reject_reason text check (char_length(reject_reason) <= 1000),
  unique (lead_id, version)
);

create index if not exists panel_proposals_lead_idx on panel_proposals (lead_id, version desc);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_proposals enable row level security;
