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
