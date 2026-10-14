-- Finanzas v4: la plata cobrada vive en un solo lugar. Los cobros de los
-- proyectos dejan panel_payments y pasan a ser ingresos de panel_finance con
-- proyecto: cobrados si ya entraron, pendientes si no. Así Inicio, Finanzas y
-- la ficha de cada proyecto suman lo mismo. Aplicar en el SQL editor de
-- Supabase después de finance-v3.sql. Se puede correr más de una vez.
--
-- Cada cobro se copia con el mismo id, su fecha, nota, quién lo cargó y quién
-- lo cobró. panel_payments no guardaba cotización: se usa la del movimiento de
-- Finanzas con la fecha más cercana. La tabla vieja queda renombrada como
-- panel_payments_migrados por las dudas; cuando se vea que está todo, se borra.
--
-- Mientras no se corra, el panel lee las dos tablas y no cuenta nada dos veces.
do $$
begin
  if to_regclass('public.panel_payments') is null then
    raise notice 'No hay panel_payments: los cobros ya están en Finanzas.';
    return;
  end if;

  if exists (select 1 from panel_payments) and not exists (select 1 from panel_finance) then
    raise exception 'Finanzas está vacía y no hay de dónde sacar la cotización: cargá un movimiento en Finanzas y volvé a correr este archivo.';
  end if;

  insert into panel_finance (
    id, created_at, kind, occurred_on, currency, amount, fx, category,
    description, project_slug, recurring, until, created_by, owner, status
  )
  select
    p.id, p.created_at, 'ingreso', p.paid_on, 'USD', p.amount,
    (select f.fx from panel_finance f
      order by abs(f.occurred_on - p.paid_on), f.created_at desc
      limit 1),
    'proyecto', p.note, p.project_slug, false, null, p.created_by, p.owner, 'pagado'
  from panel_payments p
  on conflict (id) do nothing;

  alter table panel_payments rename to panel_payments_migrados;
  alter index if exists panel_payments_project_idx rename to panel_payments_migrados_project_idx;
end $$;

-- Para la ficha de cada proyecto, que lee sus ingresos.
create index if not exists panel_finance_project_idx
  on panel_finance (project_slug, occurred_on desc) where project_slug is not null;
