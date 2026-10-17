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
