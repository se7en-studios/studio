-- Seguridad v2: «Cerrar todas las sesiones» desde /admin/seguridad. Aplicar en el
-- SQL editor de Supabase. Se puede correr más de una vez.
--
-- panel_settings guarda ajustes sueltos del panel (clave → valor). El primero es
-- session_epoch: el momento (milisegundos) desde el que valen las sesiones. Una
-- cookie firmada antes de esa hora deja de valer, así que cambiarlo saca a todos
-- del panel sin tocar ADMIN_SESSION_SECRET. Sin esta tabla, el panel funciona
-- como antes (las sesiones duran 7 días y no se pueden cortar).
create table if not exists panel_settings (
  key text primary key check (char_length(key) between 1 and 64),
  value text not null check (char_length(value) <= 2000),
  updated_at timestamptz not null default now()
);

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_settings enable row level security;

-- Los ingresos al panel y el corte de sesiones van al Registro como «seguridad».
-- Si panel-v3.sql todavía no corrió, se anotaron como «proyecto» (el tipo de
-- antes): acá se pasan a «seguridad». Son las mismas reglas que kindOf() en
-- lib/admin/event-shared.ts. Sin panel-v3.sql la base no acepta el tipo nuevo:
-- se saltea y lo hace la próxima vez que se corra este archivo.
do $$
begin
  update panel_events set kind = 'seguridad'
  where kind = 'proyecto'
    and text ~ '^(entró al panel|no pudo entrar al panel|cerró todas las sesiones)';
exception
  when check_violation or undefined_table then null;
end $$;
