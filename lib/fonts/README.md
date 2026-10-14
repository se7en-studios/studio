Tipografías del sitio, desde el repo en vez de bajarse de Google Fonts en cada
build (eso hacía fallar el CI de vez en cuando). Son los archivos latinos que
sirve Google Fonts, con los mismos pesos y estilos que se usaban; los de nombre
sin peso son variables. Se cargan en `lib/site-fonts.ts` (Archivo, Chivo Mono,
Silkscreen) y `lib/brand-fonts.ts` (las de las marcas de los casos).

Todas con licencia SIL Open Font License 1.1 (https://openfontlicense.org); el
copyright y la licencia van también dentro de cada archivo.

- archivo-latin (100–900): © 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo).
- chivo-mono-latin (100–900): © 2018 The Chivo Project Authors (https://github.com/Omnibus-Type/Chivo).
- silkscreen-latin-400: © 2001 The Silkscreen Project Authors (https://github.com/googlefonts/silkscreen).
- anton-latin-400: © 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont).
- bricolage-grotesque-latin (200–800): © 2022 The Bricolage Grotesque Project Authors (https://github.com/ateliertriay/bricolage).
- playfair-display-latin-600 e -italic-600: © 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display).
- barlow-condensed-latin-800/900 e -italic-800/900: © 2017 The Barlow Project Authors (https://github.com/jpt/barlow).
- plus-jakarta-sans-latin-800: © 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans).
- outfit-latin (100–900): © 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts).
