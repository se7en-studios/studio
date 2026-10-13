-- Finanzas v3: quién cobró cada pago de un proyecto. Todo se divide 50/50 entre
-- los socios; con esto Finanzas calcula quién le debe a quién. Aplicar en el SQL
-- editor de Supabase (después de finance-v2.sql). Se puede correr más de una vez.
alter table panel_payments
  add column if not exists owner text not null default 'ambos'
  check (owner in ('ambos', 'franco', 'federico'));
