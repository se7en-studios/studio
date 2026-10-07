-- Límite de envíos por IP de los formularios públicos (/api/contact,
-- /api/leads) y bloqueo del login de /admin tras intentos fallidos.
-- Se guarda el sha256 de la IP, nunca la IP en claro.
-- Aplicar pegando este archivo en el SQL editor de Supabase.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_key_created_idx
  on public.rate_limit_hits (bucket, key_hash, created_at desc);

-- Sin políticas: con RLS activo y sin policies, nadie con la anon key puede
-- leer ni escribir. Sólo el servidor, con la service role key.
alter table public.rate_limit_hits enable row level security;

-- Limpieza: las ventanas son de 10–15 minutos, lo viejo no sirve. Correr de
-- vez en cuando (o programarlo con pg_cron):
--   delete from public.rate_limit_hits where created_at < now() - interval '1 day';
