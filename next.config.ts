import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El default de Next es sólo ['image/webp']. AVIF pesa bastante menos para
    // screenshots de sitios y el navegador cae solo a WebP si no lo soporta.
    formats: ["image/avif", "image/webp"],
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
    ];
  },
};

export default nextConfig;
