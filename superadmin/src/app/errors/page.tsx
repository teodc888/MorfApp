'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getErrors, updateErrorResolved, type ErrorLog } from '@/lib/superadmin-api'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ErrorsPage() {
  const [items, setItems] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlyUnresolved, setOnlyUnresolved] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 30

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getErrors({
        resolved: onlyUnresolved ? false : undefined,
        page,
        pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
      setUnresolvedCount(data.unresolvedCount)
      setError(null)
    } catch {
      setError('No se pudo cargar la lista de errores')
    } finally {
      setLoading(false)
    }
  }, [onlyUnresolved, page])

  useEffect(() => {
    load()
  }, [load])

  async function handleToggleResolved(item: ErrorLog) {
    setUpdating(item.id)
    try {
      await updateErrorResolved(item.id, !item.isResolved)
      if (onlyUnresolved && !item.isResolved) {
        // Al marcarlo resuelto, con el filtro activo desaparece de la lista
        setItems(prev => prev.filter(i => i.id !== item.id))
        setTotal(prev => prev - 1)
      } else {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isResolved: !i.isResolved } : i))
      }
      setUnresolvedCount(prev => item.isResolved ? prev + 1 : prev - 1)
      toast.success(item.isResolved ? 'Error reabierto' : 'Error marcado como resuelto')
    } catch {
      toast.error('No se pudo actualizar el error')
    } finally {
      setUpdating(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Errores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unresolvedCount} sin resolver{total > 0 ? ` · ${total} en esta vista` : ''}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={onlyUnresolved}
            onChange={(e) => { setOnlyUnresolved(e.target.checked); setPage(1) }}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Solo no resueltos
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Negocio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Endpoint</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Excepción</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <Fragment key={item.id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-700">{item.tenantName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-700">{item.method} {item.path}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.exceptionType}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{item.message}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.isResolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.isResolved ? 'Resuelto' : 'Sin resolver'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleResolved(item) }}
                            disabled={updating === item.id}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              item.isResolved
                                ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                : 'text-green-700 bg-green-50 hover:bg-green-100'
                            }`}
                          >
                            {updating === item.id ? '...' : item.isResolved ? 'Reabrir' : 'Marcar resuelto'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <p className="text-sm text-gray-700 mb-2"><strong>Mensaje:</strong> {item.message}</p>
                          <pre className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {item.stackTrace ?? 'Sin stacktrace'}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-2">✅</p>
                <p>{onlyUnresolved ? 'No hay errores sin resolver' : 'No hay errores registrados'}</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
