/** La ventanita de «En vivo»: también es lo que se ve mientras baja. Siempre de noche, en los dos temas. */
export function MapFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-[#07070a] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
      {children}
    </div>
  );
}
