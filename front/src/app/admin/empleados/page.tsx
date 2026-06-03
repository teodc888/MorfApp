'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlanGate } from '@/components/admin/PlanGate'
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  activateEmployeeLogin,
  deactivateEmployeeLogin,
  getEmployeePayments,
  registerPayment,
  getEmployeeAdvances,
  registerAdvance,
  getEmployeesPending,
} from '@/lib/admin-api'
import type {
  EmployeeDto,
  SalaryPaymentDto,
  EmployeeAdvanceDto,
  EmployeePendingDto,
  CreateEmployeeBody,
  RegisterPaymentBody,
  RegisterAdvanceBody,
} from '@/types/store'

type Tab = 'empleados' | 'pagos' | 'pendientes'

type EmployeeForm = {
  name: string
  phone: string
  email: string
  position: string
  remunerationType: 'fixed' | 'hourly' | 'mixed'
  baseSalary: string
  hourlyRate: string
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly'
  paymentDay: string
  hireDate: string
}

const today = new Date().toISOString().split('T')[0]

const EMPTY_EMPLOYEE_FORM: EmployeeForm = {
  name: '',
  phone: '',
  email: '',
  position: '',
  remunerationType: 'fixed',
  baseSalary: '',
  hourlyRate: '',
  paymentFrequency: 'monthly',
  paymentDay: '1',
  hireDate: today,
}

type PaymentForm = {
  periodStart: string
  periodEnd: string
  basePaid: string
  hoursWorked: string
  hoursAmount: string
  bonus: string
  isAguinaldo: boolean
  notes: string
  paidAt: string
}

const EMPTY_PAYMENT_FORM: PaymentForm = {
  periodStart: today,
  periodEnd: today,
  basePaid: '',
  hoursWorked: '',
  hoursAmount: '',
  bonus: '0',
  isAguinaldo: false,
  notes: '',
  paidAt: today,
}

type AdvanceForm = {
  amount: string
  reason: string
  date: string
}

const EMPTY_ADVANCE_FORM: AdvanceForm = { amount: '', reason: '', date: today }

const FREQ_LABELS: Record<string, string> = { monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal' }
const REM_LABELS: Record<string, string> = { fixed: 'Fijo', hourly: 'Por hora', mixed: 'Mixto' }

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EmpleadosPageInner() {
  const [tab, setTab] = useState<Tab>('empleados')

  // ── Data ──
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [pending, setPending] = useState<EmployeePendingDto[]>([])
  const [payments, setPayments] = useState<SalaryPaymentDto[]>([])
  const [advances, setAdvances] = useState<EmployeeAdvanceDto[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDto | null>(null)

  // ── Loading / error ──
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Modals ──
  type EmployeeModal = { open: boolean; editing: EmployeeDto | null }
  const [employeeModal, setEmployeeModal] = useState<EmployeeModal>({ open: false, editing: null })
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; employee: EmployeeDto | null }>({ open: false, employee: null })
  const [advanceModal, setAdvanceModal] = useState<{ open: boolean; employee: EmployeeDto | null }>({ open: false, employee: null })
  const [detailModal, setDetailModal] = useState<{ open: boolean; employee: EmployeeDto | null }>({ open: false, employee: null })
  const [confirmDeactivate, setConfirmDeactivate] = useState<{ open: boolean; employee: EmployeeDto | null }>({ open: false, employee: null })

  // ── Forms ──
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(EMPTY_EMPLOYEE_FORM)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM)
  const [advanceForm, setAdvanceForm] = useState<AdvanceForm>(EMPTY_ADVANCE_FORM)

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadEmployees = useCallback(async () => {
    try {
      setError(null)
      const data = await getEmployees()
      setEmployees(data)
    } catch {
      setError('No se pudieron cargar los empleados')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPending = useCallback(async () => {
    try {
      const data = await getEmployeesPending()
      setPending(data)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    loadEmployees()
    loadPending()
  }, [loadEmployees, loadPending])

  async function loadEmployeeDetail(employee: EmployeeDto) {
    setSelectedEmployee(employee)
    try {
      const [p, a] = await Promise.all([
        getEmployeePayments(employee.id),
        getEmployeeAdvances(employee.id),
      ])
      setPayments(p)
      setAdvances(a)
    } catch {
      showToast('Error cargando historial', 'error')
    }
  }

  // ── Employee CRUD ──
  function openNewEmployee() {
    setEmployeeForm(EMPTY_EMPLOYEE_FORM)
    setEmployeeModal({ open: true, editing: null })
  }

  function openEditEmployee(emp: EmployeeDto) {
    setEmployeeForm({
      name: emp.name,
      phone: emp.phone ?? '',
      email: emp.email ?? '',
      position: emp.position ?? '',
      remunerationType: emp.remunerationType,
      baseSalary: emp.baseSalary.toString(),
      hourlyRate: emp.hourlyRate.toString(),
      paymentFrequency: emp.paymentFrequency,
      paymentDay: emp.paymentDay.toString(),
      hireDate: emp.hireDate.split('T')[0],
    })
    setEmployeeModal({ open: true, editing: emp })
  }

  const isEmployeeFormValid =
    employeeForm.name.trim().length >= 2 &&
    (employeeForm.remunerationType === 'hourly' || Number(employeeForm.baseSalary) >= 0) &&
    (employeeForm.remunerationType === 'fixed' || Number(employeeForm.hourlyRate) >= 0)

  async function saveEmployee() {
    if (!isEmployeeFormValid || saving) return
    setSaving(true)
    try {
      const body: CreateEmployeeBody = {
        name: employeeForm.name.trim(),
        phone: employeeForm.phone.trim() || undefined,
        email: employeeForm.email.trim() || undefined,
        position: employeeForm.position.trim() || undefined,
        remunerationType: employeeForm.remunerationType,
        baseSalary: Number(employeeForm.baseSalary) || 0,
        hourlyRate: Number(employeeForm.hourlyRate) || 0,
        paymentFrequency: employeeForm.paymentFrequency,
        paymentDay: Number(employeeForm.paymentDay),
        hireDate: new Date(employeeForm.hireDate).toISOString(),
      }
      if (employeeModal.editing) {
        await updateEmployee(employeeModal.editing.id, body)
      } else {
        await createEmployee(body)
      }
      setEmployeeModal({ open: false, editing: null })
      await loadEmployees()
      await loadPending()
      showToast(employeeModal.editing ? 'Empleado actualizado' : 'Empleado creado')
    } catch {
      showToast('Error guardando empleado', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivateEmployee(emp: EmployeeDto) {
    setSaving(true)
    try {
      await deleteEmployee(emp.id)
      setConfirmDeactivate({ open: false, employee: null })
      await loadEmployees()
      await loadPending()
      showToast('Empleado dado de baja')
    } catch {
      showToast('Error dando de baja', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Login activation ──
  async function handleActivateLogin(emp: EmployeeDto) {
    if (!emp.email) {
      showToast('El empleado necesita un email para activar el acceso', 'error')
      return
    }
    setSaving(true)
    try {
      const result = await activateEmployeeLogin(emp.id)
      await loadEmployees()
      showToast(result.message)
    } catch {
      showToast('Error activando acceso', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivateLogin(emp: EmployeeDto) {
    setSaving(true)
    try {
      await deactivateEmployeeLogin(emp.id)
      await loadEmployees()
      showToast('Acceso desactivado')
    } catch {
      showToast('Error desactivando acceso', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Payment ──
  function openPaymentModal(emp: EmployeeDto) {
    const start = new Date()
    start.setDate(1)
    setPaymentForm({
      ...EMPTY_PAYMENT_FORM,
      basePaid: emp.baseSalary.toString(),
      periodStart: start.toISOString().split('T')[0],
      periodEnd: today,
      paidAt: today,
    })
    setPaymentModal({ open: true, employee: emp })
  }

  const isPaymentFormValid = Number(paymentForm.basePaid) >= 0 &&
    paymentForm.periodStart && paymentForm.periodEnd

  async function savePayment() {
    if (!paymentModal.employee || !isPaymentFormValid || saving) return
    setSaving(true)
    try {
      const body: RegisterPaymentBody = {
        periodStart: new Date(paymentForm.periodStart).toISOString(),
        periodEnd: new Date(paymentForm.periodEnd).toISOString(),
        basePaid: Number(paymentForm.basePaid) || 0,
        hoursWorked: paymentForm.hoursWorked ? Number(paymentForm.hoursWorked) : undefined,
        hoursAmount: Number(paymentForm.hoursAmount) || 0,
        bonus: Number(paymentForm.bonus) || 0,
        isAguinaldo: paymentForm.isAguinaldo,
        notes: paymentForm.notes.trim() || undefined,
        paidAt: new Date(paymentForm.paidAt).toISOString(),
      }
      await registerPayment(paymentModal.employee.id, body)
      setPaymentModal({ open: false, employee: null })
      await loadEmployees()
      await loadPending()
      showToast('Pago registrado correctamente')
    } catch {
      showToast('Error registrando pago', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Advance ──
  function openAdvanceModal(emp: EmployeeDto) {
    setAdvanceForm(EMPTY_ADVANCE_FORM)
    setAdvanceModal({ open: true, employee: emp })
  }

  const isAdvanceFormValid = advanceForm.amount !== '' && Number(advanceForm.amount) !== 0

  async function saveAdvance() {
    if (!advanceModal.employee || !isAdvanceFormValid || saving) return
    setSaving(true)
    try {
      const body: RegisterAdvanceBody = {
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason.trim() || undefined,
        date: new Date(advanceForm.date).toISOString(),
      }
      await registerAdvance(advanceModal.employee.id, body)
      setAdvanceModal({ open: false, employee: null })
      await loadEmployees()
      showToast('Adelanto registrado')
    } catch {
      showToast('Error registrando adelanto', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const activeEmployees = employees.filter(e => e.isActive)
  const inactiveEmployees = employees.filter(e => !e.isActive)

  return (
    <div style={{ fontFamily: 'var(--sans)', color: 'var(--text)' }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all`}
          style={{ backgroundColor: toast.type === 'success' ? 'var(--primary)' : '#DC2626', color: '#fff' }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Empleados</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{activeEmployees.length} activos</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNewEmployee}>+ Nuevo empleado</button>
      </div>

      {/* Error */}
      {error && (
        <div className="chip error mb-4 px-4 py-2 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface-container)' }}>
        {(['empleados', 'pendientes', 'pagos'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize"
            style={{
              backgroundColor: tab === t ? 'var(--surface)' : 'transparent',
              color: tab === t ? 'var(--primary)' : 'var(--muted)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t === 'empleados' ? 'Empleados' : t === 'pendientes' ? 'Pendientes' : 'Historial'}
          </button>
        ))}
      </div>

      {/* ── Tab: Empleados ── */}
      {tab === 'empleados' && (
        <div>
          {activeEmployees.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="text-4xl mb-2">👥</p>
              <p>No hay empleados cargados aún</p>
            </div>
          )}

          <div className="space-y-3">
            {activeEmployees.map(emp => (
              <div key={emp.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{emp.name}</span>
                      {emp.position && (
                        <span className="chip text-xs" style={{ backgroundColor: 'var(--surface-container)', color: 'var(--muted)' }}>
                          {emp.position}
                        </span>
                      )}
                      {emp.hasAdminLogin && (
                        <span className="chip text-xs" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                          <span className="mat sm" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 2 }}>admin_panel_settings</span>
                          Acceso admin
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                      <span>{REM_LABELS[emp.remunerationType]} · {FREQ_LABELS[emp.paymentFrequency]}</span>
                      {emp.remunerationType !== 'hourly' && <span>Sueldo: {formatMoney(emp.baseSalary)}</span>}
                      {emp.remunerationType !== 'fixed' && <span>Tarifa: {formatMoney(emp.hourlyRate)}/h</span>}
                      <span>Pago día {emp.paymentDay}</span>
                    </div>
                    {emp.pendingAdvances !== 0 && (
                      <div className="mt-1.5 text-xs font-medium" style={{ color: emp.pendingAdvances > 0 ? '#D97706' : '#059669' }}>
                        {emp.pendingAdvances > 0
                          ? `Adelanto pendiente: ${formatMoney(emp.pendingAdvances)}`
                          : `Descuento pendiente: ${formatMoney(Math.abs(emp.pendingAdvances))}`}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 200 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => openPaymentModal(emp)}>Pagar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openAdvanceModal(emp)}>Adelanto</button>
                    <button className="btn btn-outline btn-sm" style={{ minWidth: 36, padding: '8px 10px' }} onClick={() => { loadEmployeeDetail(emp); setDetailModal({ open: true, employee: emp }) }}>
                      <span className="mat sm">history</span>
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ minWidth: 36, padding: '8px 10px' }} onClick={() => openEditEmployee(emp)}>
                      <span className="mat sm">edit</span>
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ minWidth: 36, padding: '8px 10px' }} onClick={() => emp.hasAdminLogin ? handleDeactivateLogin(emp) : handleActivateLogin(emp)}
                      title={emp.hasAdminLogin ? 'Quitar acceso al panel' : 'Dar acceso al panel'}>
                      <span className="mat sm">{emp.hasAdminLogin ? 'no_accounts' : 'manage_accounts'}</span>
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ minWidth: 36, padding: '8px 10px' }} onClick={() => setConfirmDeactivate({ open: true, employee: emp })}>
                      <span className="mat sm">person_off</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {inactiveEmployees.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm cursor-pointer" style={{ color: 'var(--muted)' }}>
                {inactiveEmployees.length} empleado{inactiveEmployees.length !== 1 ? 's' : ''} inactivo{inactiveEmployees.length !== 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-3">
                {inactiveEmployees.map(emp => (
                  <div key={emp.id} className="card p-3 opacity-50">
                    <span className="text-sm font-medium">{emp.name}</span>
                    {emp.position && <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{emp.position}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Tab: Pendientes ── */}
      {tab === 'pendientes' && (
        <div className="space-y-4">
          {pending.some(p => p.aguinaldoDue) && (
            <div className="card p-4" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="mat" style={{ color: '#D97706' }}>calendar_month</span>
                <span className="font-semibold text-sm" style={{ color: '#92400E' }}>Aguinaldo (SAC) próximo</span>
              </div>
              <p className="text-xs" style={{ color: '#92400E' }}>
                Este mes corresponde pagar el Sueldo Anual Complementario. Los montos estimados se muestran en cada empleado.
              </p>
            </div>
          )}

          {pending.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="text-4xl mb-2">✅</p>
              <p>No hay empleados activos con pagos pendientes</p>
            </div>
          )}

          {pending.map(emp => {
            const isOverdue = emp.daysUntilPayment < 0
            const isDueSoon = emp.daysUntilPayment >= 0 && emp.daysUntilPayment <= 3
            const dotColor = isOverdue ? '#DC2626' : isDueSoon ? '#D97706' : '#10B981'

            return (
              <div key={emp.employeeId} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className="font-semibold text-sm">{emp.employeeName}</span>
                      {emp.position && <span className="text-xs" style={{ color: 'var(--muted)' }}>{emp.position}</span>}
                    </div>
                    <div className="mt-1.5 text-xs space-y-0.5" style={{ color: 'var(--muted)' }}>
                      <div>
                        Próximo pago:{' '}
                        <span className="font-medium" style={{ color: isOverdue ? '#DC2626' : isDueSoon ? '#D97706' : 'var(--text)' }}>
                          {formatDate(emp.nextPaymentDate)}
                          {isOverdue ? ` (hace ${Math.abs(emp.daysUntilPayment)} días)` : emp.daysUntilPayment === 0 ? ' (hoy)' : ` (en ${emp.daysUntilPayment} días)`}
                        </span>
                      </div>
                      {emp.remunerationType !== 'hourly' && <div>Sueldo: {formatMoney(emp.baseSalary)}</div>}
                      {emp.remunerationType !== 'fixed' && <div>Tarifa hora: {formatMoney(emp.hourlyRate)}</div>}
                      {emp.pendingAdvances !== 0 && (
                        <div style={{ color: '#D97706' }}>
                          Adelantos a deducir: {formatMoney(emp.pendingAdvances)}
                        </div>
                      )}
                      {emp.aguinaldoDue && emp.aguinaldoEstimate > 0 && (
                        <div style={{ color: '#7C3AED' }}>
                          SAC estimado: {formatMoney(emp.aguinaldoEstimate)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const employee = employees.find(e => e.id === emp.employeeId)
                        if (employee) openPaymentModal(employee)
                      }}>
                      Pagar
                    </button>
                    {emp.aguinaldoDue && emp.aguinaldoEstimate > 0 && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#7C3AED', borderColor: '#7C3AED' }}
                        onClick={() => {
                          const employee = employees.find(e => e.id === emp.employeeId)
                          if (employee) {
                            setPaymentForm({
                              ...EMPTY_PAYMENT_FORM,
                              basePaid: emp.aguinaldoEstimate.toFixed(0),
                              isAguinaldo: true,
                              periodStart: today,
                              periodEnd: today,
                              paidAt: today,
                              notes: 'SAC (Aguinaldo)',
                            })
                            setPaymentModal({ open: true, employee })
                          }
                        }}>
                        Pagar SAC
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tab: Historial ── */}
      {tab === 'pagos' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {activeEmployees.map(emp => (
              <button
                key={emp.id}
                className="btn btn-sm"
                style={{
                  backgroundColor: selectedEmployee?.id === emp.id ? 'var(--primary)' : 'var(--surface-container)',
                  color: selectedEmployee?.id === emp.id ? '#fff' : 'var(--text)',
                }}
                onClick={() => loadEmployeeDetail(emp)}>
                {emp.name}
              </button>
            ))}
          </div>

          {!selectedEmployee && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>Seleccioná un empleado para ver su historial</p>
          )}

          {selectedEmployee && (
            <div>
              <h2 className="font-semibold mb-3 text-sm" style={{ color: 'var(--muted)' }}>
                Pagos — {selectedEmployee.name}
              </h2>
              {payments.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin pagos registrados aún</p>
              ) : (
                <div className="space-y-2 mb-6">
                  {payments.map(p => (
                    <div key={p.id} className="card p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{formatMoney(p.totalPaid)}</span>
                            {p.isAguinaldo && (
                              <span className="chip text-xs" style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}>SAC</span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                            {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                          </div>
                          {(p.advancesDeducted !== 0 || p.bonus !== 0) && (
                            <div className="text-xs mt-0.5 space-x-2" style={{ color: 'var(--muted)' }}>
                              {p.basePaid > 0 && <span>Base: {formatMoney(p.basePaid)}</span>}
                              {p.bonus > 0 && <span>+Bonus: {formatMoney(p.bonus)}</span>}
                              {p.advancesDeducted > 0 && <span>-Adelantos: {formatMoney(p.advancesDeducted)}</span>}
                            </div>
                          )}
                          {p.notes && <p className="text-xs italic mt-0.5" style={{ color: 'var(--muted)' }}>{p.notes}</p>}
                        </div>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(p.paidAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="font-semibold mb-3 text-sm" style={{ color: 'var(--muted)' }}>
                Adelantos — {selectedEmployee.name}
              </h2>
              {advances.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin adelantos registrados</p>
              ) : (
                <div className="space-y-2">
                  {advances.map(a => (
                    <div key={a.id} className="card p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-semibold text-sm" style={{ color: a.amount > 0 ? '#D97706' : '#059669' }}>
                            {a.amount > 0 ? '+' : ''}{formatMoney(a.amount)}
                          </span>
                          {a.reason && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{a.reason}</p>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(a.date)}</div>
                          <span className="chip text-xs mt-1" style={{
                            backgroundColor: a.isApplied ? '#16A34A' : '#D97706',
                            color: '#FFFFFF',
                          }}>
                            {a.isApplied ? 'Aplicado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Nuevo/Editar Empleado ── */}
      {employeeModal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setEmployeeModal({ open: false, editing: null })}>
          <div className="modal-sheet" style={{ maxWidth: 520, maxHeight: '90dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">{employeeModal.editing ? 'Editar empleado' : 'Nuevo empleado'}</h2>

              <div className="space-y-3">
                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Nombre *</label>
                  <input className="input" value={employeeForm.name} onChange={e => setEmployeeForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Juan Pérez" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Cargo / Rol</label>
                    <input className="input" value={employeeForm.position} onChange={e => setEmployeeForm(f => ({ ...f, position: e.target.value }))} placeholder="Ej: Cocinero" />
                  </div>
                  <div className="field">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Teléfono</label>
                    <input className="input" value={employeeForm.phone} onChange={e => setEmployeeForm(f => ({ ...f, phone: e.target.value }))} placeholder="+54 11..." />
                  </div>
                </div>

                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Email (para acceso al admin)</label>
                  <input className="input" type="email" value={employeeForm.email} onChange={e => setEmployeeForm(f => ({ ...f, email: e.target.value }))} placeholder="empleado@ejemplo.com" />
                </div>

                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Tipo de remuneración</label>
                  <select className="select" value={employeeForm.remunerationType} onChange={e => setEmployeeForm(f => ({ ...f, remunerationType: e.target.value as 'fixed' | 'hourly' | 'mixed' }))}>
                    <option value="fixed">Sueldo fijo mensual</option>
                    <option value="hourly">Por hora</option>
                    <option value="mixed">Mixto (fijo + horas)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {employeeForm.remunerationType !== 'hourly' && (
                    <div className="field">
                      <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Sueldo base ($)</label>
                      <input className="input" type="number" min="0" value={employeeForm.baseSalary} onChange={e => setEmployeeForm(f => ({ ...f, baseSalary: e.target.value }))} placeholder="0" />
                    </div>
                  )}
                  {employeeForm.remunerationType !== 'fixed' && (
                    <div className="field">
                      <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Tarifa por hora ($)</label>
                      <input className="input" type="number" min="0" value={employeeForm.hourlyRate} onChange={e => setEmployeeForm(f => ({ ...f, hourlyRate: e.target.value }))} placeholder="0" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Frecuencia de pago</label>
                    <select className="select" value={employeeForm.paymentFrequency} onChange={e => setEmployeeForm(f => ({ ...f, paymentFrequency: e.target.value as 'monthly' | 'biweekly' | 'weekly' }))}>
                      <option value="monthly">Mensual</option>
                      <option value="biweekly">Quincenal</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Día de pago</label>
                    <input className="input" type="number" min="1" max="31" value={employeeForm.paymentDay} onChange={e => setEmployeeForm(f => ({ ...f, paymentDay: e.target.value }))} />
                  </div>
                </div>

                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Fecha de ingreso</label>
                  <input className="input" type="date" value={employeeForm.hireDate} onChange={e => setEmployeeForm(f => ({ ...f, hireDate: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="btn btn-outline btn-sm flex-1" onClick={() => setEmployeeModal({ open: false, editing: null })}>Cancelar</button>
                <button className="btn btn-primary btn-sm flex-1" disabled={saving || !isEmployeeFormValid} onClick={saveEmployee}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Registrar Pago ── */}
      {paymentModal.open && paymentModal.employee && (
        <div className="modal-backdrop modal-center" onClick={() => setPaymentModal({ open: false, employee: null })}>
          <div className="modal-sheet" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-1">Registrar pago</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{paymentModal.employee.name}</p>

              {paymentModal.employee.pendingAdvances > 0 && (
                <div className="chip mb-4 px-3 py-2 text-xs rounded-lg" style={{ backgroundColor: '#FFF7ED', color: '#92400E' }}>
                  Se descontarán automáticamente {formatMoney(paymentModal.employee.pendingAdvances)} en adelantos pendientes.
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Período desde</label>
                    <input className="input" type="date" value={paymentForm.periodStart} onChange={e => setPaymentForm(f => ({ ...f, periodStart: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Período hasta</label>
                    <input className="input" type="date" value={paymentForm.periodEnd} onChange={e => setPaymentForm(f => ({ ...f, periodEnd: e.target.value }))} />
                  </div>
                </div>

                {paymentModal.employee.remunerationType !== 'hourly' && (
                  <div className="field">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Sueldo base ($)</label>
                    <input className="input" type="number" min="0" value={paymentForm.basePaid} onChange={e => setPaymentForm(f => ({ ...f, basePaid: e.target.value }))} />
                  </div>
                )}

                {paymentModal.employee.remunerationType !== 'fixed' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="field">
                      <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Horas trabajadas</label>
                      <input className="input" type="number" min="0" value={paymentForm.hoursWorked} onChange={e => setPaymentForm(f => ({ ...f, hoursWorked: e.target.value }))} placeholder="0" />
                    </div>
                    <div className="field">
                      <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Importe horas ($)</label>
                      <input className="input" type="number" min="0" value={paymentForm.hoursAmount} onChange={e => setPaymentForm(f => ({ ...f, hoursAmount: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Bonus / Extra ($)</label>
                  <input className="input" type="number" min="0" value={paymentForm.bonus} onChange={e => setPaymentForm(f => ({ ...f, bonus: e.target.value }))} placeholder="0" />
                </div>

                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Fecha de pago</label>
                  <input className="input" type="date" value={paymentForm.paidAt} onChange={e => setPaymentForm(f => ({ ...f, paidAt: e.target.value }))} />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={paymentForm.isAguinaldo} onChange={e => setPaymentForm(f => ({ ...f, isAguinaldo: e.target.checked }))} />
                  <span className="text-sm">Es aguinaldo (SAC)</span>
                </label>

                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Notas</label>
                  <input className="input" value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
                </div>

                {/* Resumen */}
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--surface-container)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Total a pagar</span>
                    <span className="font-bold" style={{ color: 'var(--primary)' }}>
                      {formatMoney(
                        (Number(paymentForm.basePaid) || 0) +
                        (Number(paymentForm.hoursAmount) || 0) +
                        (Number(paymentForm.bonus) || 0) -
                        paymentModal.employee.pendingAdvances
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button className="btn btn-outline btn-sm flex-1" onClick={() => setPaymentModal({ open: false, employee: null })}>Cancelar</button>
                <button className="btn btn-primary btn-sm flex-1" disabled={saving || !isPaymentFormValid} onClick={savePayment}>
                  {saving ? 'Registrando...' : 'Confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Adelanto ── */}
      {advanceModal.open && advanceModal.employee && (
        <div className="modal-backdrop modal-center" onClick={() => setAdvanceModal({ open: false, employee: null })}>
          <div className="modal-sheet" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-1">Adelanto / Descuento</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{advanceModal.employee.name}</p>

              <div className="space-y-3">
                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Monto ($)</label>
                  <input className="input" type="number" value={advanceForm.amount}
                    onChange={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="Positivo = adelanto · Negativo = descuento" />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Ej: 5000 para dar un adelanto, -2000 para aplicar un descuento</p>
                </div>
                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Motivo</label>
                  <input className="input" value={advanceForm.reason} onChange={e => setAdvanceForm(f => ({ ...f, reason: e.target.value }))} placeholder="Opcional" />
                </div>
                <div className="field">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Fecha</label>
                  <input className="input" type="date" value={advanceForm.date} onChange={e => setAdvanceForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button className="btn btn-outline btn-sm flex-1" onClick={() => setAdvanceModal({ open: false, employee: null })}>Cancelar</button>
                <button className="btn btn-primary btn-sm flex-1" disabled={saving || !isAdvanceFormValid} onClick={saveAdvance}>
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Detalle empleado ── */}
      {detailModal.open && detailModal.employee && (
        <div className="modal-backdrop modal-center" onClick={() => setDetailModal({ open: false, employee: null })}>
          <div className="modal-sheet" style={{ maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{detailModal.employee.name}</h2>
                  {detailModal.employee.position && <p className="text-sm" style={{ color: 'var(--muted)' }}>{detailModal.employee.position}</p>}
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setDetailModal({ open: false, employee: null })}>✕</button>
              </div>

              <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--muted)' }}>Últimos pagos</h3>
              {payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between py-2 border-b text-sm" style={{ borderColor: 'var(--outline)' }}>
                  <div>
                    <span className="font-medium">{formatMoney(p.totalPaid)}</span>
                    {p.isAguinaldo && <span className="ml-2 text-xs" style={{ color: '#7C3AED' }}>SAC</span>}
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{formatDate(p.periodStart)} → {formatDate(p.periodEnd)}</div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(p.paidAt)}</span>
                </div>
              ))}
              {payments.length === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin pagos registrados</p>}

              <h3 className="font-semibold text-sm mt-4 mb-2" style={{ color: 'var(--muted)' }}>Adelantos pendientes</h3>
              {advances.filter(a => !a.isApplied).map(a => (
                <div key={a.id} className="flex justify-between py-2 border-b text-sm" style={{ borderColor: 'var(--outline)' }}>
                  <div>
                    <span className="font-medium" style={{ color: a.amount > 0 ? '#D97706' : '#059669' }}>
                      {a.amount > 0 ? '+' : ''}{formatMoney(a.amount)}
                    </span>
                    {a.reason && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{a.reason}</div>}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(a.date)}</span>
                </div>
              ))}
              {advances.filter(a => !a.isApplied).length === 0 && (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin adelantos pendientes</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar dar de baja ── */}
      {confirmDeactivate.open && confirmDeactivate.employee && (
        <div className="modal-backdrop modal-center" onClick={() => setConfirmDeactivate({ open: false, employee: null })}>
          <div className="modal-sheet" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-2">Dar de baja</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                ¿Estás seguro que querés dar de baja a <strong>{confirmDeactivate.employee.name}</strong>? No podrás hacer nuevos pagos ni adelantos mientras esté inactivo.
              </p>
              <div className="flex gap-3">
                <button className="btn btn-outline btn-sm flex-1" onClick={() => setConfirmDeactivate({ open: false, employee: null })}>Cancelar</button>
                <button className="btn btn-danger btn-sm flex-1" disabled={saving} onClick={() => handleDeactivateEmployee(confirmDeactivate.employee!)}>
                  {saving ? '...' : 'Dar de baja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmpleadosPage() {
  return (
    <PlanGate minPlan="Negocio" feature="Empleados y sueldos">
      <EmpleadosPageInner />
    </PlanGate>
  )
}
