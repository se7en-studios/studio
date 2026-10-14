import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El default de Next es sólo ['image/webp']. AVIF pesa bastante menos para
    // screenshots de sitios y el navegador cae solo a WebP si no lo soporta.
    formats: ["image/avif", "image/webp"],
  },

  // Cabeceras de seguridad. En todo el sitio: el navegador no adivina tipos de
  // archivo y los links salientes no llevan la dirección completa. El panel,
  // además, no se puede mostrar dentro de otra página (evita que lo incrusten
  // para hacer clic por vos). El sitio público no se toca más que eso: no se le
  // pone CSP para no romper shaders, fuentes ni Analytics.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/admin/:path*", // también /admin: el comodín acepta cero tramos
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },

  // Páginas que se sacaron del sitio. Van a 308 y no a 404 porque pueden
  // quedar enlaces viejos dando vueltas, y porque un 404 tira a la basura lo
  // que esas URLs hubieran acumulado en buscadores. El destino es el tema
  // sobreviviente más cercano, no la home: mandar todo a la home es lo mismo
  // que perderlo.
  async redirects() {
    return [
      { source: "/portal", destination: "/work", permanent: true },
      { source: "/security", destination: "/tech", permanent: true },
      { source: "/design-system", destination: "/tech", permanent: true },
      { source: "/playground", destination: "/tech", permanent: true },
      { source: "/roi", destination: "/pricing", permanent: true },
    ];
  },
};

export default nextConfig;
