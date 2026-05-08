'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  type ModifierGroupAdmin,
  type ModifierOptionForm,
} from '@/lib/admin-api'

type GroupForm = {
  name: string
  type: 'Single' | 'Multiple'
  isRequired: boolean
  maxSelect: string
  options: ModifierOptionForm[]
}

const EMPTY_GROUP: GroupForm = {
  name: '',
  type: 'Multiple',
  isRequired: false,
  maxSelect: '',
  options: [],
}

const EMPTY_OPTION: ModifierOptionForm = { name: '', emoji: '', extraPrice: 0, sortOrder: 0 }

export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroupAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modal, setModal] = useState<{ open: boolean; editing: ModifierGroupAdmin | null }>({
    open: false,
    editing: null,
  })
  const [form, setForm] = useState<GroupForm>(EMPTY_GROUP)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      setGroups(await getModifierGroups())
    } catch {
      setError('No se pudieron cargar los grupos')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  function openNew() {
    setForm({ ...EMPTY_GROUP, options: [] })
    setModal({ open: true, editing: null })
  }

  function openEdit(g: ModifierGroupAdmin) {
    setForm({
      name: g.name,
      type: g.type,
      isRequired: g.isRequired,
      maxSelect: g.maxSelect != null ? String(g.maxSelect) : '',
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        emoji: o.emoji,
        extraPrice: o.extraPrice,
        sortOrder: o.sortOrder,
      })),
    })
    setModal({ open: true, editing: g })
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const body = {
        name: form.name,
        type: form.type,
        isRequired: form.isRequired,
        maxSelect: form.maxSelect ? parseInt(form.maxSelect) : null,
        sortOrder: modal.editing?.sortOrder ?? groups.length,
        options: form.options.map((o, i) => ({ ...o, sortOrder: i })),
      }
      if (modal.editing) {
        await updateModifierGroup(modal.editing.id, body)
      } else {
        await createModifierGroup(body)
      }
      setModal({ open: false, editing: null })
      await load()
    } catch {
      setError('Error al guardar el grupo')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este grupo? Se desasignará de todos los productos.')) return
    try {
      await deleteModifierGroup(id)
      await load()
    } catch {
      setError('Error al eliminar el grupo')
    }
  }

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, { ...EMPTY_OPTION }] }))
  }

  function updateOption<K extends keyof ModifierOptionForm>(
    index: number,
    key: K,
    value: ModifierOptionForm[K],
  ) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, [key]: value } : o)),
    }))
  }

  function removeOption(index: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Personalizaciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">Creá grupos de opciones y asignalos a los productos desde Carta</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Nuevo grupo
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {groups.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">✨</p>
          <p className="font-medium">No hay grupos de personalización</p>
          <p className="text-sm mt-1">Creá uno y asignalo a tus productos desde la sección Carta</p>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{g.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {g.type === 'Single' ? 'Única opción' : 'Múltiple'}
                  </span>
                  {g.isRequired && (
                    <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Obligatorio</span>
                  )}
                  {g.maxSelect && (
                    <span className="text-xs text-gray-400">máx. {g.maxSelect}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {g.options.map((o) => (
                    <span key={o.id} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-gray-600">
                      {o.emoji && <span>{o.emoji}</span>}
                      {o.name}
                      {o.extraPrice > 0 && (
                        <span className="text-gray-400">+${o.extraPrice.toLocaleString('es-AR')}</span>
                      )}
                    </span>
                  ))}
                  {g.options.length === 0 && (
                    <span className="text-xs text-gray-400">Sin opciones aún</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(g)}
                  className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(g.id)}
                  className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-0">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 space-y-4">
            <h2 className="font-bold text-gray-900">
              {modal.editing ? 'Editar grupo' : 'Nuevo grupo'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Punto de cocción, Extras, Bebidas..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <div className="flex gap-2">
                    {(['Single', 'Multiple'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          form.type === t
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {t === 'Single' ? 'Una opción' : 'Múltiple'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.type === 'Multiple' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx. selecciones</label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxSelect}
                      onChange={(e) => setForm((f) => ({ ...f, maxSelect: e.target.value }))}
                      placeholder="Sin límite"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))}
                  className="w-4 h-4 accent-orange-600"
                />
                <span className="text-sm text-gray-700">Obligatorio (el cliente debe elegir)</span>
              </label>

              {/* Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Opciones</label>
                  <button
                    onClick={addOption}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Agregar opción
                  </button>
                </div>

                {form.options.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                    Agregá las opciones que puede elegir el cliente
                  </p>
                )}

                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.emoji}
                        onChange={(e) => updateOption(i, 'emoji', e.target.value)}
                        placeholder="😀"
                        className="w-12 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => updateOption(i, 'name', e.target.value)}
                        placeholder="Nombre de la opción"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={opt.extraPrice || ''}
                        onChange={(e) => updateOption(i, 'extraPrice', parseFloat(e.target.value) || 0)}
                        placeholder="+$0"
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        onClick={() => removeOption(i)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal({ open: false, editing: null })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
