-- Caja fuerte del panel (Cuentas): usuarios y claves de las cuentas del estudio
-- (Instagram, Vercel, Supabase, Gmail…). Aplicar en el SQL editor de Supabase.
-- Se puede correr más de una vez.
--
-- Las claves y las notas NUNCA se guardan en claro: llegan cifradas con AES-256-GCM
-- desde el servidor (la llave es la variable VAULT_KEY de Vercel y no está en la base).
-- Una copia de la base sin esa llave no sirve para leerlas.
create table if not exists panel_vault (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  service text not null check (char_length(service) between 1 and 40),
  label text not null default '' check (char_length(label) <= 80),
  url text check (url is null or (url ~ '^https://' and char_length(url) <= 300)),
  username text not null default '' check (char_length(username) <= 120),
  -- Texto cifrado (v1.iv.tag.datos). Nunca la clave en claro.
  secret_enc text not null,
  notes_enc text,
  twofa text not null default 'app' check (twofa in ('ninguno', 'app', 'llave', 'sms')),
  owner text not null default 'ambos' check (owner in ('ambos', 'franco', 'federico')),
  -- Cuándo se cambió la clave por última vez: de ahí sale el aviso de rotarla.
  rotated_on date not null default current_date,
  created_by text check (created_by in ('franco', 'federico'))
);

create index if not exists panel_vault_service_idx on panel_vault (service, label);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_vault enable row level security;

-- El freno de intentos de la caja usa esta tabla (la misma del login del panel). Si ya
-- corriste supabase/rate-limit.sql no hace nada; se incluye acá porque, sin ella, la caja
-- se queda cerrada a propósito.
create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_bucket_key_created_idx
  on public.rate_limit_hits (bucket, key_hash, created_at desc);
alter table public.rate_limit_hits enable row level security;
