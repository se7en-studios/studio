/** El marco del mapa de «En vivo»: también es lo que se ve mientras baja. Siempre de noche, en los dos temas. */
export function MapFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-[#07070a] sm:aspect-[16/10] lg:aspect-[16/9]">
      {children}
    </div>
  );
}
