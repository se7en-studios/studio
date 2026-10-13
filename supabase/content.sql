-- Panel de contenido: un post de Instagram por fila (qué subir, caption, archivos
-- y si ya se publicó). Aplicar pegando este archivo en el SQL editor de
-- Supabase (después de panel.sql). Se puede correr más de una vez.
-- Los archivos viven en el bucket `panel` (de panel.sql) bajo `contenido-ig/<id>/`.

create table if not exists content_posts (
  id text primary key,
  post_date date not null,
  kind text not null check (kind in ('reel', 'carrusel', 'historias', 'perfil')),
  title text not null,
  pinned boolean not null default false,
  -- Instrucciones del día: el texto del LEEME y los consejos sueltos.
  steps text not null default '',
  tips text[] not null default '{}',
  caption text not null default '',
  -- [{ path, name, size, mime }] con la ruta dentro del bucket `panel`, en orden de subida.
  files jsonb not null default '[]',
  done_at timestamptz,
  done_by text check (done_by in ('franco', 'federico'))
);

create index if not exists content_posts_date_idx on content_posts (post_date);

-- Igual que el resto del panel: RLS activo y sin policies. Sólo el servidor,
-- con la service role key, lee y escribe.
alter table content_posts enable row level security;
