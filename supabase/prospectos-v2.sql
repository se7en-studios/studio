-- Seguimiento del radar: cuándo y quién le escribió por última vez a cada
-- prospecto (contacted_by / contacted_at siguen siendo el primer contacto).
-- Aplicar en el SQL editor de Supabase después de prospectos.sql. Se puede
-- correr más de una vez.

alter table prospect_state add column if not exists last_contact_at timestamptz;
alter table prospect_state add column if not exists last_contact_by text
  check (last_contact_by in ('franco', 'federico'));
