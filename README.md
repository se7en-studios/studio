# STUDIO

Portfolio website for a digital product / creative technology studio.

> **Naming note:** "STUDIO" is a placeholder brand name used throughout the codebase.
> It lives in one place — `data/site.ts` — so renaming the brand is a one-file change.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/) for motion design
- [Lucide](https://lucide.dev) icons
- [Supabase](https://supabase.com) — prepared, optional (see below)
- Deploys on [Vercel](https://vercel.com)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Content

All content ships from typed local data files — no database required to run the site:

- `data/site.ts` — brand name, tagline, contact links, stats
- `data/projects.ts` — the six case studies (source of truth for `/work/[slug]`)
- `data/services.ts` — services, process steps, technology list
- `data/team.ts` — founders and testimonials (testimonials section auto-hides when empty)

Project screenshots go in `public/projects/` — see the README there for filenames.

## Supabase (optional CMS path)

The site does **not** require Supabase to run. `supabase/schema.sql` defines the tables
(`projects`, `project_images`, `services`, `testimonials`, `team_members`, `site_settings`)
for a future migration off the local data files. `lib/supabase.ts` exposes a client that
activates once the env vars below are set — swap the reads in `data/*.ts` for Supabase
queries when you're ready to add a CMS/admin.

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Both are optional in v1.

### Panel del estudio (`/admin`)

El panel de Franco y Federico: un CRM para llevar todos los pedidos y proyectos
del estudio y hablar entre nosotros.

- **Inicio**: lo que está para atender, proyectos en curso, tus tareas, los
  últimos mensajes y la actividad del equipo.
- **Mensajes**: un canal general y una conversación por cada proyecto o pedido
  (también desde la ficha de cada uno). Menciones con `@franco` / `@federico`.
- **Pedidos**: tablero por etapa (Nuevo → Contactado → Propuesta → Ganado /
  Perdido) o lista, con responsable, monto, historial de contacto,
  seguimientos, notas y la conversación del pedido.
- **Proyectos**: tablero por etapa (Descubrimiento → Diseño → Desarrollo →
  Revisión → Entregado / Mantenimiento / Pausado), lista editable o galería.
  Cada proyecto tiene responsable, avance, fechas, cliente, monto, notas,
  tareas, archivos, cobros (seña, saldo, cuotas: cuánto falta cobrar) y su
  conversación. Un pedido Ganado se pasa a proyecto con un click y queda
  vinculado.
- **Registro**: todo cambio queda anotado con quién, cuándo y el antes y el
  después de cada campo. Se filtra por tipo, persona y texto.
- **⌘K** en cualquier pantalla para buscar y saltar a un pedido, proyecto o tarea.

El panel no usa el layout del sitio público (`app/(site)/layout.tsx`): no carga
auroras, scroll suave ni el footer 3D. Las acciones no re-renderizan la página
(los cambios son optimistas) y el registro se escribe después de responder.

Variables en Vercel (Settings → Environment Variables), y después redeploy:

```bash
ADMIN_PASSWORD=             # contraseña del panel (no va en el código: el repo es público)
SUPABASE_URL=               # Supabase → Project Settings → API
SUPABASE_SERVICE_ROLE_KEY=  # idem; sólo se usa en el servidor
# ADMIN_SESSION_SECRET=     # opcional; por defecto se deriva de la contraseña
```

Las tablas se crean pegando en el SQL editor de Supabase, en este orden:
`supabase/leads.sql`, `panel.sql`, `tasks.sql`, `crm.sql`, `panel-v2.sql` y `payments.sql`
(estado de proyectos, mensajes y detalle del registro). Todos se pueden correr
más de una vez. Lo que falte, el panel lo avisa en vez de romperse.

## Project structure

```
app/(site)/           public site routes (home, /work/[slug]…) and their chrome
app/admin/            the studio panel (own layout, no site chrome)
components/ui/        design-system primitives (Container, RevealText, MagneticLink…)
components/sections/  page sections (Hero, SelectedWork, Services, Process, About…)
components/work/      case-study/work-grid components
data/                 typed local content
lib/                  Supabase client
types/                shared TypeScript types
supabase/schema.sql   future CMS schema
```

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

## Deploy

Push to GitHub and import into Vercel — no configuration required for v1 (Supabase env
vars are optional). Framework preset: Next.js.
