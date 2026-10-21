Capturas de cada proyecto, tomadas del sitio en vivo a 1440×900 (@1.5x).

- takefyy-2026-09.jpg
- apex-ai-2026-10.jpg (la landing nueva, rediseño «CARGA»)
- pone-la-pava-2026-09b.jpg
- pravilo-2026-09.jpg
- sentinel-2026-09.jpg
- altum-sci-2026-09.jpg
- muzzaga-2026-09.jpg
- iphone-vita-2026-09.jpg

Referenciadas desde `data/projects.ts` (campo `image`). Al actualizar una
captura, cambiar el sufijo de fecha: next/image cachea por URL y con el mismo
nombre seguiría sirviendo la versión vieja.

`gallery/` tiene las capturas del producto por dentro (campo `gallery`), para
los casos que son más que su sitio. Las de Apex salen de las muestras de
marketing del repo de APEX (`marketing/`): el render real de la app con datos
inventados, nunca de la app en producción. Escritorio a 2000 de ancho con el
monitor dibujado; celular a 780×1688 (390×844 @2x), sin marco. Las del coach
(2026-10b) llevan los avatares de los atletas, como el coach real y la landing
de APEX: misma asignación con semilla fija que su `capturar-panel.js`.
