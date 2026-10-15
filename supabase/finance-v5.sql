-- Finanzas v5: plata con fecha. Aplicar en el SQL editor de Supabase después de
-- finance-v4.sql. Se puede correr más de una vez.
--
-- 1. Cotización con fuente: cada movimiento dice de dónde salió su cotización
--    (MEP, oficial, blue, a mano o «estimada» para los cobros migrados).
-- 2. Fecha prevista (due_on) aparte de la real (occurred_on): marcar un
--    pendiente como cobrado ya no pierde cuándo vencía.
-- 3. Ingresos recurrentes como plan: dejan de contarse solos y cada mes genera
--    un pendiente (columna series, única). Los meses ya pasados se pasan una
--    sola vez a cobros con la cotización del plan, así el histórico no cambia.
-- 4. Herramientas con baja con fecha e historial de precios: los meses pasados
--    quedan con lo que se pagó entonces.
-- 5. Categoría de monotributo de cada socio, para el medidor de Finanzas.

alter table panel_finance
  add column if not exists fx_source text
  check (fx_source is null or fx_source in ('mep', 'oficial', 'blue', 'manual', 'estimada'));

alter table panel_finance add column if not exists due_on date;

-- Los pendientes vencen en su fecha.
update panel_finance set due_on = occurred_on where status = 'pendiente' and due_on is null;

-- Los cobros que finance-v4.sql copió de panel_payments tomaron la cotización más cercana.
do $$
begin
  if to_regclass('public.panel_payments_migrados') is not null then
    update panel_finance set fx_source = 'estimada'
    where fx_source is null and id in (select id from panel_payments_migrados);
  end if;
end $$;

-- Ingresos recurrentes → pendiente por mes. Sólo la primera vez (cuando todavía
-- no existe la columna): los meses anteriores al actual, que hasta hoy se
-- contaban como cobrados, quedan como cobros reales con la misma clave que usa
-- el panel («<id>:YYYY-MM»), así no se generan de nuevo como pendientes.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'panel_finance' and column_name = 'series'
  ) then
    return;
  end if;

  alter table panel_finance add column series text check (series is null or char_length(series) <= 120);

  insert into panel_finance (
    kind, occurred_on, currency, amount, fx, fx_source, category, description,
    project_slug, recurring, until, created_by, owner, status, due_on, series
  )
  select
    'ingreso', d.day, f.currency, f.amount, f.fx, f.fx_source, f.category, f.description,
    f.project_slug, false, null, f.created_by, f.owner, 'pagado', d.day,
    f.id::text || ':' || to_char(d.day, 'YYYY-MM')
  from panel_finance f
  cross join lateral (
    select least(
      (m + (extract(day from f.occurred_on)::int - 1) * interval '1 day')::date,
      (m + interval '1 month' - interval '1 day')::date
    ) as day
    from generate_series(
      date_trunc('month', f.occurred_on::timestamp),
      least(
        date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') - interval '1 month',
        coalesce(date_trunc('month', f.until::timestamp), 'infinity'::timestamp)
      ),
      interval '1 month'
    ) as m
  ) d
  where f.kind = 'ingreso' and f.recurring and f.status = 'pagado';
end $$;

create unique index if not exists panel_finance_series_idx on panel_finance (series);

-- Herramientas: baja con fecha (sigue contando hasta ese mes) y precios viejos
-- [{ until, amount, currency, cycle, fx }], del más viejo al más nuevo.
alter table panel_tools add column if not exists ended_on date;
alter table panel_tools add column if not exists prices jsonb not null default '[]'::jsonb;

-- Categoría de monotributo de cada socio (los topes están en lib/admin/plata-shared.ts).
create table if not exists panel_monotributo (
  owner text primary key check (owner in ('franco', 'federico')),
  category text not null check (category in ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K')),
  updated_at timestamptz not null default now()
);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_monotributo enable row level security;
