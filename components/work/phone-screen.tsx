import Image from "next/image";
import type { ReactNode } from "react";

/**
 * La pantalla de un iPhone (390×844 pt): arriba la barra de estado con la
 * Dynamic Island, y el sitio empieza debajo, como en el teléfono de verdad. La
 * barra son los 54 pt de arriba; las capturas de `screens.mobile` se sacan a
 * 390×790, justo lo que queda debajo, así la isla nunca tapa el sitio. La barra
 * es un SVG con el mismo viewBox, así que escala entera con el ancho del teléfono.
 *
 * El marco (bisel, sombra, giro) lo pone quien la usa; `children` va encima de la
 * captura (un video, por ejemplo) y ocupa el mismo lugar.
 */
export function PhoneScreen({
  src,
  alt,
  sizes,
  className = "",
  children,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`flex aspect-[390/844] flex-col overflow-hidden bg-black ${className}`}>
      <svg viewBox="0 0 390 54" aria-hidden className="block w-full shrink-0">
        <text
          x="54"
          y="34"
          textAnchor="middle"
          fill="#fff"
          fontSize="16"
          fontWeight="600"
          fontFamily="-apple-system, system-ui, sans-serif"
        >
          9:41
        </text>
        <rect x="132" y="11" width="126" height="36" rx="18" fill="#0b0b0d" stroke="#ffffff" strokeOpacity="0.08" />
        {/* Señal, wifi y batería */}
        <g fill="#fff">
          <rect x="294" y="26" width="3" height="5" rx="1" />
          <rect x="299" y="24" width="3" height="7" rx="1" />
          <rect x="304" y="21.5" width="3" height="9.5" rx="1" />
          <rect x="309" y="19" width="3" height="12" rx="1" />
          <path d="M325 31.5l-2.6-2.7a3.7 3.7 0 0 1 5.2 0zM319.6 26a7.6 7.6 0 0 1 10.8 0l-1.4 1.4a5.6 5.6 0 0 0-8 0zM316.8 23.2a11.6 11.6 0 0 1 16.4 0l-1.4 1.4a9.6 9.6 0 0 0-13.6 0z" />
          <rect x="342.5" y="19.5" width="23" height="12" rx="3.5" fill="none" stroke="#fff" strokeOpacity="0.45" />
          <rect x="344.5" y="21.5" width="19" height="8" rx="2" />
          <rect x="367" y="23.5" width="1.6" height="4" rx="0.8" fillOpacity="0.45" />
        </g>
      </svg>
      <div className="relative flex-1">
        <Image src={src} alt={alt} draggable={false} fill sizes={sizes} className="object-cover object-top" />
        {children}
      </div>
    </div>
  );
}
