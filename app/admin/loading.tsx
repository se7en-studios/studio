// Lo que se ve al instante mientras llega una sección del panel: la navegación
// responde en el clic aunque los datos tarden.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-6">
      <div className="space-y-2">
        <div className="admin-skeleton h-3 w-28 rounded" />
        <div className="admin-skeleton h-8 w-64 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="admin-skeleton h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="admin-skeleton h-[360px] rounded-xl" />
        <div className="admin-skeleton h-[360px] rounded-xl" />
      </div>
    </div>
  );
}
