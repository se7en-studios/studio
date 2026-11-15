# Sitio de prueba · dirección «Superficie y profundidad»

Versión navegable del rediseño de SE7EN para probar y aprobar el diseño. Es HTML, CSS y JavaScript estáticos, sin build ni dependencias.

- Se publica en el proyecto de Vercel **se7en-rediseno-prueba**, separado del proyecto `studio` que sirve www.se7en.com.ar.
- Vive en la rama `claude/admiring-davinci-o9d5j3`. **No se mergea a `master`.** En esa rama, el `vercel.json` de la raíz desactiva los deploys del proyecto `studio`, así producción no construye nada.
- No usa variables de entorno ni credenciales, no llama a la API de SE7EN y no tiene analítica.
- El formulario de contacto valida y muestra un estado simulado: no envía datos.
- Todas las páginas llevan `noindex` y `robots.txt` bloquea a los buscadores.

## Páginas

- `/`: home, con el selector de la demo (Hero A / Hero B).
- `/casos/<proyecto>`: un caso por proyecto. El de Muzzaga incluye el visor del recorrido 3D.
- `/demo`: qué funciona, qué es demostración y qué falta para el sitio definitivo.
- `/identidad`: hoja de identidad visual.
- `/privacidad`: pendiente de redacción legal.

## Probar en local

Cualquier servidor estático sirve. Las rutas sin `.html`, como `/casos/apex`, requieren URLs limpias (`cleanUrls` en `vercel.json`).
