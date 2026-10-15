-- Clientes: una ficha por cliente (contactos, datos fiscales y notas) a la que
-- se cuelgan sus proyectos y las cuentas de la caja fuerte que son suyas.
-- Aplicar en el SQL editor de Supabase después de panel-v2.sql y vault.sql.
-- Se puede correr más de una vez.
--
-- Crea un cliente por cada nombre de cliente escrito a mano en los proyectos
-- (panel_project_state.client) y los vincula. Si el proyecto vino de un pedido,
-- le copia el email y el teléfono del pedido. Los proyectos sin cliente siguen
-- funcionando igual.

create table if not exists panel_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  -- Persona de contacto (puede ser distinta del nombre del cliente o empresa).
  contact text not null default '' check (char_length(contact) <= 120),
  email text not null default '' check (char_length(email) <= 200),
  whatsapp text not null default '' check (char_length(whatsapp) <= 40),
  -- Datos fiscales, opcionales.
  cuit text not null default '' check (char_length(cuit) <= 20),
  iva text not null default '' check (iva in ('', 'monotributo', 'responsable_inscripto', 'exento', 'consumidor_final', 'exterior')),
  notes text not null default '' check (char_length(notes) <= 10000),
  created_by text check (created_by in ('franco', 'federico'))
);

-- Un nombre, un cliente (sin importar mayúsculas): así la migración y el paso
-- «pedido ganado → proyecto» no duplican.
create unique index if not exists panel_clients_name_idx on panel_clients (lower(name));

-- RLS activo y sin policies: sólo el servidor, con la service role key.
alter table panel_clients enable row level security;

-- Proyecto → cliente. Borrar un cliente deja sus proyectos sin cliente, no los borra.
alter table panel_project_state
  add column if not exists client_id uuid references panel_clients (id) on delete set null;
create index if not exists panel_project_state_client_idx on panel_project_state (client_id) where client_id is not null;

-- Cuenta de la caja fuerte → cliente (hosting, dominio, Instagram del cliente…).
alter table panel_vault
  add column if not exists client_id uuid references panel_clients (id) on delete set null;

-- Los clientes que ya estaban escritos a mano en los proyectos.
insert into panel_clients (name)
select distinct on (lower(btrim(client))) left(btrim(client), 120)
from panel_project_state
where btrim(client) <> ''
on conflict do nothing;

update panel_project_state s
set client_id = c.id
from panel_clients c
where s.client_id is null
  and btrim(s.client) <> ''
  and lower(btrim(s.client)) = lower(c.name);

-- Contacto del pedido de origen, si el cliente todavía no lo tiene.
update panel_clients c
set email = left(l.email, 200)
from panel_project_state s
join leads l on l.id = s.lead_id
where s.client_id = c.id and c.email = '' and coalesce(l.email, '') <> '';

update panel_clients c
set whatsapp = left(l.phone, 40)
from panel_project_state s
join leads l on l.id = s.lead_id
where s.client_id = c.id and c.whatsapp = '' and coalesce(l.phone, '') <> '';

-- Para deshacerlo: alter table panel_vault drop column client_id;
-- alter table panel_project_state drop column client_id; drop table panel_clients;
