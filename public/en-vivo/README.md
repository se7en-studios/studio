# El fichín de «En vivo» (landing)

Los clips y cuadros de `components/rd/arcade.tsx`. Salen de una sola toma,
`Retro_arcade_machine_zooming_in_20261016180942.mp4` (1920×1080, 24 fps, 192
cuadros), cortada en dos para que la intro y el zoom empalmen sin salto:

| Archivo | Cuadros | Qué es |
|---|---|---|
| `arcade-intro-*` | 0–144 | la cámara llega al fichín, se prende y queda de frente con la pantalla negra |
| `arcade-zoom-*` | 145–191 | la cámara se mete en la pantalla |
| `arcade-inicio-*.jpg` | 0 | lo que se ve antes de que arranque la intro |
| `arcade-frente-*.jpg` | 144 | el fichín de frente (sin movimiento, sin autoplay, ahorro de datos) |

`-m` es la versión para celular (1280×720, sólo MP4). La otra toma que vino
con esta (`Retro_arcade_machine_turns_on`) no se usa: el encuadre no coincide
con el del zoom y el corte se notaba.

## El marco: la página rota (`pagina-rota*.webp`)

El fichín se ve por un agujero rasgado en la página, como si se hubiera roto y
del otro lado estuvieran las máquinas. Son dos láminas de Flow (Nano Banana,
oct 2026): una apaisada para la compu y una parada para el celular, en la
carpeta `landing/` de los personajes (no van al repo). `scripts/pagina-rota.mjs`
pasa el verde del agujero a transparente, el negro de la hoja al negro de la
página (así el borde de la imagen no se nota) y recorta el negro que sobra:

    node scripts/pagina-rota.mjs "C:/Users/feder/OneDrive/Escritorio/personajes/landing"

La caja del fichín tiene la proporción de cada lámina (en `components/rd/arcade.tsx`),
así no se deforma. Al entrar a la oficina la hoja se desvanece. La instrucción:

    Flat 2D illustration with a clean hand-cut paper look, crisp edges, flat
    colors. A sheet of matte near-black paper (#0B0B0C) fills the entire image
    edge to edge [...]. In the center a big irregular hole is ripped through the
    sheet, as if the web page was torn open [...] a thin ragged off-white core
    (#F2EEE6) like torn paper fibers, and a few small torn flaps curl back [...]
    A thin warm orange (#FF4D2E) layer peeks between the black and the
    off-white at a few spots. The inside of the hole is solid flat pure green
    (#00FF00) [...]. No text, no letters, no objects, nothing else.

## Medidas que usa el código

Sobre el cuadro de 1920×1080 (ver `SCREEN_ON`, `SCREEN_IN`, `GLASS` y `ZOOM_K`):

- Pantalla de frente (cuadro 144): x 718–1235, y 353–736.
- Pantalla al final del zoom (cuadro 191): x 382–1677, y 93–1067.
- Del cuadro 144 al 191 la pantalla crece ×2,52 (ajustado contra los dos cuadros).

Si se cambia la toma, hay que volver a medir: el cartel de la pantalla, el
vidrio por donde se abre la oficina y el travelling de vuelta dependen de esto.

## Comandos

```bash
ffmpeg -i toma.mp4 -an -vf "trim=end_frame=145,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 28 -movflags +faststart arcade-intro-2026-10.mp4
```

```bash
ffmpeg -i toma.mp4 -an -vf "trim=start_frame=145,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 28 -movflags +faststart arcade-zoom-2026-10.mp4
```

Las WebM, con `-c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1`; las de celular, con
`scale=1280:720`. Los cuadros, con `select='eq(n\,144)'` y `-q:v 3`.

## Los personajes de la oficina (`personajes/`)

Las ilustraciones de Federico (Flow, oct 2026): Federico, Franco, el guía y la
visita, una pose por imagen sobre fondo verde, mirando abajo a la derecha (y
de espaldas, arriba a la derecha; las otras dos direcciones salen espejadas).
`scripts/personajes.mjs` saca el verde, recorta, escala a 192 px de alto la
figura parada, las apoya por los pies y arma una tira por personaje
(`federico.webp`, `franco.webp`, `guia.webp`, `visita.webp`) con las medidas
en `lib/oficinas/personajes.ts`. Las originales no van al repo.

    node scripts/personajes.mjs "C:/Users/feder/OneDrive/Escritorio/personajes"

Qué archivo es cada pose está en `POSES` del script. La visita es una sola: el
motor le cambia el color de la campera según el id de cada una.

Las caminatas salen de una lámina por personaje y dirección («caminata
frente.jpg», «caminata espaldas.jpg»): dos filas de cuatro figuras con un ciclo
de dos pasos, hechas con Nano Banana 2.1 en Flow a partir de la pose caminando
(los modelos de video de Flow rechazan estos personajes por el parecido con
series de terceros). El script corta las ocho figuras solo, las iguala en
altura con la pose parada y las apoya bajo la cabeza, para que el cuerpo
avance parejo. El parpadeo (`blink`) no es una imagen: el script tapa lo
blanco de los ojos de la pose parada con el color de la piel y le traza el
párpado. La instrucción que se usó para las láminas:

    Animation sprite sheet of the character in the reference image, drawn
    exactly the same [...]. Two rows of four full-body frames (8 frames total)
    showing one smooth, seamless walk cycle, read left to right, top row then
    bottom row: 1 right leg forward heel touching, 2 weight down with knees
    bent, 3 passing with legs together, 4 rising on the toes, 5 left leg
    forward heel touching, 6 weight down, 7 passing, 8 rising. Every frame
    faces three-quarter to the right like the reference [de espaldas: seen
    from behind, three-quarter back view, walking away toward the upper
    right], same size, same height, feet on the same ground line, evenly
    spaced on a grid, figures never overlapping or touching. Arms swing
    opposite to the legs. Solid flat pure green background (#00FF00), no
    shadows, no floor, no text, no numbers, no grid lines.

En el motor, un ciclo dura dos baldosas (un paso por baldosa: el pie no
patina) y cada uno acelera al arrancar y frena al llegar.

Con la misma técnica hay dos láminas más por personaje:

- **«saludo y charla.jpg»** (los cuatro): cuatro cuadros saludando con la
  mano y cuatro hablando. Cuando dos se cruzan, los que caminan frenan, se
  dan vuelta, saludan y dicen «HOLA!». El guía habla un rato en cada sala del
  recorrido.
- **«parado y celular.jpg»** (los cuatro): cuatro cuadros parados (respira,
  cambia el peso, mira a un costado, la mano en el bolsillo) y cuatro con el
  celular (lee, scrollea, se ríe, escribe). Quieto de frente, cada uno va
  pasando por esos cuadros con su propio reloj; el parpadeo va sobre el primero.
- **«espaldas quieto.jpg»** (los cuatro): de espaldas, cuatro cuadros quietos
  (respira, cambia el peso, mira a un costado, las manos atrás) y cuatro
  explicando una pantalla (la señala, abre la mano, las manos en la cintura, se
  rasca la cabeza). El guía, que mira cada pantalla de espaldas, la explica.
- **«sentado tipeando.jpg»** (Federico y Franco): de la cintura para arriba,
  con el teclado en las manos: tres cuadros tipeando, uno sonriendo a la
  pantalla, pensando, tomando café, estirándose y dormido. El script los
  apoya en la cintura y los escala para que midan lo mismo que de la cabeza al
  cinturón parados. El motor los sienta detrás de su escritorio, con la
  cintura en el borde de atrás de la tapa y el teclado arriba de ella (el
  panel del escritorio les tapa las piernas). Tipean casi siempre, sin repetir
  cuadro, y cada tanto piensan, toman café o se estiran. Si el otro socio no
  está conectado, en el panel aparece dormido. El parpadeo sentado también lo
  dibuja el script.

## Los muebles (`muebles.webp`)

Los muebles, las plantas y los árboles también son ilustraciones de Flow
(oct 2026), con el mismo dibujo que los personajes: láminas de Nano Banana 2.1
de dos filas de cuatro objetos sobre fondo verde, con la pose parada de Federico
como referencia de estilo. Las originales están en la carpeta de los personajes,
en `muebles/` (no van al repo). `scripts/muebles.mjs` saca el verde (por la
proporción de rojo y azul sobre el verde, así no se lleva el follaje), separa
cada objeto, lo recorta y los junta en una sola imagen con las medidas en
`lib/oficinas/muebles.ts`:

    node scripts/muebles.mjs "C:/Users/feder/OneDrive/Escritorio/personajes/muebles"

Qué objeto es cada uno está en `SHEETS` del script; cómo se para cada uno en
sus baldosas (hacia dónde mira en el dibujo, qué parte de la baldosa ocupa y su
altura máxima), en `SPRITES` de `lib/oficinas/art.ts`. Lo que se prende sigue
dibujado en código arriba del mueble: los monitores, la tele y las tazas suben
hasta la tapa ilustrada, y la pantalla del fichín se prende arriba del dibujo
(sus esquinas, en `screen` de `SPRITES`). Siguen en código sólo los pisos
(alfombras, felpudos, la cancha, el mat): llevan los logos. Si la imagen no
baja, quedan los muebles dibujados en código.
La instrucción base:

    Use the reference image only for the drawing style; do not draw the
    character. Isometric game asset sheet in exactly the same flat 2D cartoon
    style as the reference: thin black outlines, flat colors with one soft
    shade, adult animated sitcom look. Classic 2:1 isometric view (about 26.5
    degrees), camera from the front corner, every object's front facing the
    bottom-left of the image. Two rows of four separate objects, read left to
    right, top row then bottom row, evenly spaced, never touching or
    overlapping, each sitting on an invisible floor. Brand palette: warm orange
    #FF4D2E, near-black #0B0B0C, off-white #F2EEE6, greys and warm wood; no
    purple. Solid flat pure green background (#00FF00), no floor, no shadows,
    no text, no people. Objects: 1 …, 2 …

`fichin.jpg` tiene el fichín del Chill-out y la mesa de los celulares, y
`gestos.jpg`, los íconos del canal en vivo dibujados de frente (la taza, el
corazón y los destellos: `icon()` de art.ts). Los destellos chicos están más
separados que los pedazos sueltos de un mueble: `NEAR` del script les da más
margen para juntarlos.

Para los muebles largos (mostrador, escritorios, cocina, mesa de reuniones,
sillón, mueble de la tele) hay que pedir la proporción («six times longer than
it is tall»): si no, salen petisos y altos para sus baldosas.

## El gato (`personajes/gato.webp`)

Una lámina de Flow en la carpeta `gato/` de los personajes: cuatro cuadros
caminando, sentado, lamiéndose la pata, durmiendo hecho un ovillo y
estirándose. Sale del mismo `scripts/personajes.mjs` (no tiene pose parada de
referencia: se escala por lo que mide sentado). Quieto, cada tanto se lame o se
estira; duerme la mitad de las veces en su camita del Chill-out, al lado del
plato (los dos están en `muebles.webp`, con el botón de deploy de Desarrollo).
Los objetos de vidrio (la tapa del deploy, la vitrina) dejaban ver el verde del
fondo: `scripts/muebles.mjs` se lo saca (`GLASS`).

## El canal en vivo (`lib/oficinas/vivo.ts`)

Los que tienen la oficina abierta (la landing a pantalla completa y el mapa del
panel) se ven moverse de verdad: cada pestaña avisa a qué baldosa va su muñeco
(o si se sentó en su escritorio) y las demás lo hacen caminar hasta ahí. Si
Franco camina en su panel, Federico lo ve caminar en el suyo y las visitas de
la landing también; ellas, a su vez, aparecen en los dos paneles. Las visitas entran a la oficina por el fichín del Chill-out, como en la
landing: salen de la pantalla con un haz y destellos y caminan desde ahí. Al
irse (y al salir vos, con Esc, «Salir» o un link de la barra) la pantalla se
las lleva; la oficina se cierra cuando termina. El guía entra por la recepción.
Tocar a
alguien del canal (o el botón «Saludar a…» de los socios) abre su ficha con
tres gestos: saludar (levanta la mano con «HOLA!»), un corazón o un café, que
vuelan hasta el otro. Al que lo recibe le aparece el aviso («Franco te
saludó»). No hay texto libre.

- **Transporte:** Supabase Realtime, sólo broadcast (no toca la base), un canal
  por entorno (`se7en-en-vivo-production`, `…-preview`). En local no hay canal
  de Supabase: se ven las pestañas del mismo navegador (BroadcastChannel), así
  el desarrollo no toca producción.
- **Nadie mueve el muñeco de otro:** cada pestaña arma un par de llaves que no
  sale del navegador y pide un pase a `/admin/api/pase` (`lib/en-vivo-pase.ts`):
  quién es (la visita por su IP del día, como `/admin/api/visita`, o el socio
  con la sesión del panel), su muñeco y la llave pública de la pestaña, firmado
  por el servidor. Cada mensaje va firmado con la llave de la pestaña; los
  demás verifican el pase con la llave del servidor y el mensaje con la del
  pase, y tiran lo repetido o lo que no cierra.
- **La llave del servidor** sale de `ADMIN_SESSION_SECRET` (32 caracteres o más,
  la que ya está en Vercel). Sin ella no hay pases y la oficina anda como antes,
  sin el canal.
- **Cuánto manda:** un aviso cuando el muñeco cambia de destino (con las
  flechas, uno por baldosa), uno cada 20 s para los que entran y uno al irse.
  Al ocultar la pestaña sale del canal; los que dejan de dar noticias 50 s se
  dan por idos.

## Avisarles, escribirles y medir

- **Los dos socios, siempre a mano.** En la oficina a pantalla completa hay un
  botón por socio. Si está en la oficina (en el canal en vivo), se lo saluda
  con los gestos. Si no, «Avisale que estás acá» le manda un aviso al celular
  por ntfy (`/api/en-vivo/aviso`, a su tema personal `NTFY_TOPIC_<NOMBRE>` o
  al compartido): sólo con el pase del canal y firmado por esa pestaña, y con
  freno (uno por visita y socio cada 5 minutos, 12 por hora por IP). Tocar a
  un socio en el mapa abre la misma ficha.
- **«Escribile un mail»**, en la ficha de cada socio: el mail de la web
  (`SITE.email`) con el asunto y el saludo armados. WhatsApp directo desde la
  ficha no: a pedido de Federico, para que no lo usen para molestar.
- **La medición** (`lib/en-vivo-medicion.ts`, tabla de `supabase/en-vivo.sql`):
  entrar, salir con cuánto se quedó, cruzarse con un socio en vivo, los
  gestos, los avisos y los clics a WhatsApp, al mail y a Contacto desde adentro
  (el mail de la ficha se cuenta como Contacto). Con el
  id corto de la visita del día, nunca la IP. Los números de los últimos 30
  días se ven en el panel, en En vivo (columna del pasillo). Sin la tabla no se
  mide y la oficina sigue igual.

