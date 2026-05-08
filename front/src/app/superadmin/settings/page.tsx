'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getSettings, updateSettings } from '@/lib/superadmin-api'

const TEMPLATE_VARIABLES = [
  { variable: '{tenantName}', description: 'Nombre del negocio' },
  { variable: '{plan}', description: 'Plan (Básico, Pro, Negocio)' },
  { variable: '{expirationDate}', description: 'Fecha de vencimiento' },
]

const DEFAULT_TEMPLATE = `Hola! 👋 Te escribimos desde MorfApp. Tu plan *{plan}* para *{tenantName}* vence el *{expirationDate}*. Para renovar o consultar precios, respondé este mensaje. ¡Gracias!`

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [showVarMenu, setShowVarMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const preview = useMemo(() => {
    return template
      .replace('{tenantName}', 'Burger Co.')
      .replace('{plan}', 'Pro')
      .replace('{expirationDate}', '15 de junio de 2026')
  }, [template])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const settings = await getSettings()
      setTemplate(settings.notificationMessageTemplate || DEFAULT_TEMPLATE)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar configuración'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function insertVariable(variable: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = template.substring(0, start)
    const after = template.substring(end)
    const newTemplate = before + variable + after

    setTemplate(newTemplate)
    setShowVarMenu(false)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    setShowVarMenu(false)

    try {
      await updateSettings(template)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Personaliza el mensaje de renovación de suscripción</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plantilla de mensaje */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plantilla de mensaje de renovación</h2>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Mensaje</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVarMenu(!showVarMenu)}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors flex items-center gap-1"
                >
                  ➕ Insertar variable
                </button>
                {showVarMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {TEMPLATE_VARIABLES.map(v => (
                      <button
                        key={v.variable}
                        type="button"
                        onClick={() => insertVariable(v.variable)}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-mono font-semibold text-indigo-600 text-sm">{v.variable}</div>
                        <div className="text-xs text-gray-600">{v.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={template}
              onChange={e => setTemplate(e.target.value)}
              rows={6}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="Escribe tu mensaje personalizado"
            />
            <p className="text-xs text-gray-500 mt-2">
              El mensaje se envía a través de WhatsApp. Puedes usar *texto* para negrita.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Vista previa:</p>
            <div className="bg-white rounded border border-gray-300 p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{preview}</p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTemplate(DEFAULT_TEMPLATE)}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg text-sm transition-colors"
          >
            Restaurar predeterminado
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">✓ Cambios guardados correctamente</p>
        )}
      </form>
    </div>
  )
}
