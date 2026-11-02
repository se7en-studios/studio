-- Plantillas de seguimiento: cada plantilla es del «primero» (primer mensaje) o de
-- «seguimiento» (para los que ya se contactaron y no contestaron). Aplicar en el SQL
-- editor de Supabase después de prospect-templates.sql. Se puede correr más de una vez.
-- Los textos sugeridos están también en lib/admin/prospect-template-shared.ts (para
-- cuando la tabla no existe todavía): si se cambian acá, cambiarlos allá.

alter table prospect_templates add column if not exists kind text not null default 'primero'
  check (kind in ('primero', 'seguimiento'));

insert into prospect_templates (id, name, body, kind)
select v.id::uuid, v.name, v.body, 'seguimiento'
from (values
  ('00000000-0000-4000-8000-000000000101', 'Retomo el mensaje',
   'Hola, ¿cómo andan? Soy {yo} de Se7en Studio. Les escribí hace {dias} días por lo de {nombre}. Seguro estuvieron a mil, así que no los quiero molestar: ¿les sirve que les cuente en dos líneas de qué se trata?'),
  ('00000000-0000-4000-8000-000000000102', 'Una idea concreta',
   'Hola, {yo} de Se7en Studio de nuevo. No quiero ser insistente, solo dejarles una idea concreta para {nombre}: una web simple donde sus clientes consulten y pidan por WhatsApp sin vueltas. Si les interesa, les armo una demo sin costo.'),
  ('00000000-0000-4000-8000-000000000103', 'Cierro por mi lado',
   'Hola, soy {yo}. Por si mi mensaje se perdió entre tantos: sigo a disposición para charlar sobre {nombre} cuando les quede cómodo. Y si no es para ustedes, sin problema: avísenme y no los molesto más.')
) as v(id, name, body)
where not exists (select 1 from prospect_templates where kind = 'seguimiento');
