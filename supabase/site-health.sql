-- Salud de los sitios: el resultado del chequeo diario de cada sitio (si
-- respondió, código HTTP, cuánto tardó, vencimiento del SSL y del dominio). Lo
-- guarda la misma tarea de GitHub que saca las capturas
-- (.github/workflows/capturas.yml → /api/cron/capturas). Aplicar en el SQL
-- editor de Supabase. Se puede correr más de una vez.

create table if not exists panel_site_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  -- Caso de data/projects.ts o fila de panel_projects: sin FK, como panel_site_captures.
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,64}$'),
  url text not null check (char_length(url) <= 300),
  ok boolean not null,
  status_code int check (status_code is null or status_code between 0 and 999),
  -- Hasta que terminó de cargar, en milisegundos.
  ms int check (ms is null or ms >= 0),
  ssl_expires_on date,
  -- Por RDAP; null si el registro del dominio no lo publica (se carga a mano en el plan).
  domain_expires_on date,
  error text not null default '' check (char_length(error) <= 300),
  -- Alarma visual: la parte de la página que cambió desde la captura de ayer
  -- (0 a 1; null sin captura anterior) y si quedó casi toda de un color.
  visual_change real check (visual_change is null or visual_change between 0 and 1),
  blank boolean not null default false
);

-- Para una base donde este archivo ya se había corrido sin la alarma visual.
alter table panel_site_checks
  add column if not exists visual_change real check (visual_change is null or visual_change between 0 and 1),
  add column if not exists blank boolean not null default false;

create index if not exists panel_site_checks_slug_idx on panel_site_checks (project_slug, checked_at desc);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_site_checks enable row level security;

-- Para deshacerlo: drop table panel_site_checks;
