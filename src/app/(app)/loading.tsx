/** Squelette de chargement partagé par toutes les pages de l'app (shimmer). */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la page">
      {/* En-tête */}
      <div className="mb-sp-6 space-y-sp-2">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>

      {/* Rangée de stats */}
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-line bg-surface p-sp-5 shadow-sm">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-sp-4 h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Blocs de contenu */}
      <div className="mt-sp-6 grid gap-sp-6 lg:grid-cols-3">
        <div className="rounded-md border border-line bg-surface p-sp-5 shadow-md lg:col-span-2">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton mt-sp-5 h-40 w-full" />
        </div>
        <div className="rounded-md border border-line bg-surface p-sp-5 shadow-md">
          <div className="skeleton h-5 w-40" />
          <div className="mt-sp-5 space-y-sp-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-full" style={{ width: `${90 - i * 12}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
