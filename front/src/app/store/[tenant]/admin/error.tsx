'use client'

import { useParams, useRouter } from 'next/navigation'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const params = useParams<{ tenant: string }>()
  const base = `/store/${params.tenant}/admin`

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p className="text-5xl mb-4">⚙️</p>
      <h1 className="text-xl font-bold text-gray-800 mb-2">
        Error en el panel admin
      </h1>
      <p className="text-gray-500 mb-2">
        Ocurrió un error inesperado. Podés reintentar o volver al login.
      </p>
      {error?.message && (
        <p className="text-xs text-red-500 mb-6 max-w-sm break-all font-mono bg-red-50 px-3 py-2 rounded-lg">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
        >
          Reintentar
        </button>
        <button
          onClick={() => router.replace(`${base}/login`)}
          className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Volver al login
        </button>
      </div>
    </div>
  )
}
