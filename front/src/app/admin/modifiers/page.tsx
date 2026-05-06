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
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Page header */}
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          MODIFICADORES
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>
            Opciones
          </h1>
          <button className="btn btn-primary btn-sm" onClick={openNew} style={{ marginTop: 4 }}>
            <span className="mat sm">add</span> Nueva
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
          Definí variantes, agregados y reglas que aplicás a múltiples productos.
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{ padding: '12px 14px', background: 'var(--error-bg)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>
            {error}
          </div>
        )}

        {groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 22px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No hay grupos de personalización</div>
            <p style={{ fontSize: 13, margin: 0 }}>Creá uno y asignalo a tus productos desde la sección Carta</p>
          </div>
        )}

        {groups.map((g) => (
          <button
            key={g.id}
            className="card tap"
            onClick={() => openEdit(g)}
            style={{
              padding: 16,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              border: 'none',
              background: 'var(--surface)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'var(--surface-container)',
                  color: 'var(--primary-dark)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="mat fill">{g.type === 'Multiple' ? 'checklist' : 'radio_button_checked'}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
                  {g.name}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <span className="chip">{g.type === 'Single' ? 'Única opción' : 'Múltiple'}</span>
                  {g.isRequired && <span className="chip warning">Obligatorio</span>}
                  {g.maxSelect && <span className="chip">{g.maxSelect} máx.</span>}
                </div>
              </div>
              <span className="mat" style={{ color: 'var(--muted-soft)' }}>chevron_right</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 10, borderTop: '1px solid var(--outline-soft)' }}>
              {g.options.slice(0, 4).map((o) => (
                <span
                  key={o.id}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'var(--surface-container)',
                    color: 'var(--muted)',
                    fontWeight: 500,
                    fontSize: 12,
                  }}
                >
                  {o.name}
                  {o.extraPrice > 0 && ` +$${o.extraPrice.toLocaleString('es-AR')}`}
                </span>
              ))}
              {g.options.length > 4 && (
                <span style={{ padding: '4px 6px', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>
                  +{g.options.length - 4} más
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setModal({ open: false, editing: null })}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 24, color: 'var(--primary-dark)', fontWeight: 700 }}>
                {modal.editing ? 'Editar grupo' : 'Nuevo grupo'}
              </h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Nombre del grupo</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Punto de cocción, Extras, Bebidas..."
                />
              </div>

              <div className="field">
                <label>Tipo de selección</label>
                <div className="seg">
                  {(['Single', 'Multiple'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: form.type === t ? 'var(--primary)' : 'var(--surface-container)',
                        color: form.type === t ? 'var(--on-primary)' : 'var(--text)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'Single' ? 'Una opción' : 'Múltiple'}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'Multiple' && (
                <div className="field">
                  <label>Máx. selecciones</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={form.maxSelect}
                    onChange={(e) => setForm((f) => ({ ...f, maxSelect: e.target.value }))}
                    placeholder="Sin límite"
                  />
                </div>
              )}

              <label
                className="tap"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'var(--surface-container)',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Obligatorio</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    El cliente debe elegir antes de agregar al carrito.
                  </div>
                </div>
              </label>

              {/* Options */}
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label>Opciones</label>
                  <button className="btn btn-outline btn-sm" onClick={addOption}>
                    <span className="mat sm">add</span> Agregar opción
                  </button>
                </div>

                {form.options.length === 0 && (
                  <p style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    textAlign: 'center',
                    padding: '12px',
                    border: '1px dashed var(--outline)',
                    borderRadius: 8,
                  }}>
                    Agregá las opciones que puede elegir el cliente
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          background: 'var(--surface-container)',
                          color: 'var(--primary-dark)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: 'var(--serif)',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <input
                        type="text"
                        className="input"
                        style={{ flex: 1.6 }}
                        value={opt.name}
                        onChange={(e) => updateOption(i, 'name', e.target.value)}
                        placeholder="Nombre de la opción"
                      />
                      <input
                        type="number"
                        className="input"
                        style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}
                        step="0.01"
                        min="0"
                        value={opt.extraPrice || ''}
                        onChange={(e) => updateOption(i, 'extraPrice', parseFloat(e.target.value) || 0)}
                        placeholder="±$0"
                      />
                      {form.options.length > 1 && (
                        <button
                          className="tap"
                          onClick={() => removeOption(i)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            color: 'var(--error)',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 20,
                          }}
                        >
                          <span className="mat sm">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--outline-soft)' }}>
              <button
                className="btn btn-outline"
                onClick={() => setModal({ open: false, editing: null })}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving || !form.name.trim()}
                style={{
                  flex: 1,
                  opacity: saving || !form.name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? 'Guardando...' : modal.editing ? 'Guardar cambios' : 'Crear grupo'}
              </button>
            </div>

            {modal.editing && (
              <button
                className="btn btn-danger btn-block"
                onClick={() => {
                  remove(modal.editing!.id)
                  setModal({ open: false, editing: null })
                }}
                style={{ marginTop: 12 }}
              >
                <span className="mat sm">delete</span> Eliminar grupo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
