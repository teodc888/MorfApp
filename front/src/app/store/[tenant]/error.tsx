'use client'

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h1 className="text-xl font-bold text-zinc-800 mb-2">
        Algo salió mal
      </h1>
      <p className="text-zinc-500 mb-2">
        No pudimos cargar el menú. Por favor intentá de nuevo.
      </p>
      {error?.message && (
        <p className="text-xs text-zinc-400 mb-6 max-w-sm break-all">
          {error.message}
        </p>
      )}
      <button
        onClick={reset}
        className="px-6 py-2 rounded-full bg-zinc-800 text-white text-sm font-medium"
      >
        Reintentar
      </button>
    </div>
  )
}
