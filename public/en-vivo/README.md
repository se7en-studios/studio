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
hasta la tapa ilustrada. El fichín, el botón de deploy y la mesa de celulares
siguen en código. Si la imagen no baja, quedan los muebles dibujados en código.
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

Para los muebles largos (mostrador, escritorios, cocina, mesa de reuniones,
sillón, mueble de la tele) hay que pedir la proporción («six times longer than
it is tall»): si no, salen petisos y altos para sus baldosas.
