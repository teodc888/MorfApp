'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getMetrics, type MetricsPeriod, type MetricsData } from '@/lib/admin-api'
import { formatPrice } from '@/lib/utils'

function todayKicker(): string {
  const d = new Date()
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `HOY · ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

function Skel({ h }: { h: number }) {
  return (
    <div style={{ height: h, background: 'var(--surface-container)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
  )
}

/* ── MetricCard ─────────────────────────────────────────────────── */
function MetricCard({ label, value, delta, icon, big }: {
  label: string; value: string; delta?: string; icon: string; big?: boolean
}) {
  const positive = delta?.startsWith('+')
  const neutral = delta === '→'
  const deltaColor = neutral ? 'var(--muted)' : positive ? 'var(--success)' : 'var(--error)'

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {label}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--surface-container)', display: 'grid', placeItems: 'center', color: 'var(--primary-dark)' }}>
          <span className="mat sm fill">{icon}</span>
        </div>
      </div>
      <div className="serif" style={{ fontSize: big ? 32 : 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, color: deltaColor }}>
          {!neutral && <span className="mat xs fill">{positive ? 'trending_up' : 'trending_down'}</span>}
          <span style={{ fontSize: 12, fontWeight: 600 }}>{delta} vs ayer</span>
        </div>
      )}
    </div>
  )
}

/* ── Sparkline ─────────────────────────────────────────────────── */
function Sparkline({ data, todayIndex }: { data: { label: string; revenue: number }[]; todayIndex: number }) {
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.revenue / max) * 100)
        const isToday = i === todayIndex
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', position: 'relative' }}>
              {isToday && (
                <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap' }}>
                  HOY
                </div>
              )}
              <div style={{
                width: '100%', height: `${h}%`,
                background: isToday ? 'var(--primary)' : 'var(--primary)',
                opacity: isToday ? 1 : 0.45,
                borderRadius: '6px 6px 2px 2px',
                minHeight: 4,
              }} />
            </div>
            <div style={{ fontSize: 11, color: isToday ? 'var(--primary-dark)' : 'var(--muted)', fontWeight: isToday ? 700 : 500 }}>
              {d.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Top products ───────────────────────────────────────────────── */
function TopProducts({ data }: { data: MetricsData['topProducts'] }) {
  const top4 = data.slice(0, 4)
  const maxRev = Math.max(...top4.map(p => p.revenue), 1)

  if (top4.length === 0) {
    return (
      <div className="card" style={{ padding: '16px 18px' }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Top productos</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Sin datos</div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Top productos</div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Esta semana</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {top4.map((p, i) => (
          <div key={p.productId} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid var(--outline-soft)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="serif" style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--surface-container)', color: 'var(--primary-dark)',
                display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.productName}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {p.quantity} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>vendidos</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                  {formatPrice(p.revenue)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, marginLeft: 42 }}>
              <div style={{ height: 4, background: 'var(--surface-container)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${(p.revenue / maxRev) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 2 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Tooltip del chart ─────────────────────────────────────────── */
interface TooltipItem { value: number }
function HourTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) {
  if (!active || !payload?.length) return null
  const h = Number(label)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--outline)', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: 'var(--shadow-card)' }}>
      <p style={{ fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
        {String(h).padStart(2, '0')}:00 – {String(h + 1).padStart(2, '0')}:00
      </p>
      <p style={{ color: 'var(--primary)', fontWeight: 600, margin: 0 }}>{payload[0].value} pedidos</p>
    </div>
  )
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--outline)', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: 'var(--shadow-card)' }}>
      <p style={{ fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: 'var(--primary)', fontWeight: 600, margin: 0 }}>{formatPrice(payload[0].value)}</p>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────── */
type Period = 'today' | 'week' | 'month' | 'year'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year',  label: 'Año' },
]

export default function MetricsPage() {
  const [period, setPeriod] = useState<MetricsPeriod>('today')
  const [sparkPeriod, setSparkPeriod] = useState<'week' | 'month'>('week')

  const { data, isLoading, error, refetch } = useQuery<MetricsData, Error>({
    queryKey: ['metrics', period],
    queryFn: () => getMetrics(period),
    staleTime: 2 * 60 * 1000,
  })

  const sparkData = useMemo(() => {
    if (!data?.revenueOverTime?.length) return []
    return data.revenueOverTime.slice(-7)
  }, [data])
  const todayIdx = sparkData.length - 1

  const hourlyData = useMemo(() => {
    if (!data?.ordersByHour) return []
    return Array.from({ length: 24 }, (_, hour) => {
      const found = data.ordersByHour.find((d: { hour: number; orders: number }) => d.hour === hour)
      return { hour, orders: found?.orders ?? 0 }
    })
  }, [data])

  const kicker = todayKicker()

  return (
    <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Page header */}
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          {kicker}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>
            Métricas
          </h1>
          <button onClick={() => refetch()} className="btn btn-outline btn-sm" style={{ marginTop: 4 }}>
            <span className="mat sm">refresh</span>
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
          Cómo está rindiendo tu negocio en tiempo real.
        </p>
      </div>

      {/* Period selector */}
      <div style={{ padding: '0 22px 16px' }}>
        <div className="seg">
          {PERIODS.map(p => (
            <button key={p.key} className={period === p.key ? 'active' : ''} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ margin: '0 22px 16px', padding: '12px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-card)', fontSize: 13 }}>
          {error.message}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ padding: '0 22px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading ? (
          <>
            <Skel h={110} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Skel h={90} />
              <Skel h={90} />
            </div>
          </>
        ) : data ? (
          <>
            <MetricCard label="Ventas" value={formatPrice(data.totalRevenue)} icon="payments" big />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MetricCard label="Pedidos" value={String(data.totalOrders)} icon="receipt_long" />
              <MetricCard
                label="Ticket prom."
                value={data.totalOrders > 0 ? formatPrice(data.averageOrderValue) : '—'}
                icon="restaurant"
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Sparkline */}
      <div style={{ padding: '0 22px 14px' }}>
        {isLoading ? <Skel h={180} /> : (
          <div className="card" style={{ padding: '16px 18px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Ventas por día</div>
                {data && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Total · {formatPrice(data.totalRevenue)}
                  </div>
                )}
              </div>
              <div style={{ display: 'inline-flex', background: 'var(--surface-container)', borderRadius: 999, padding: 3 }}>
                {(['week', 'month'] as const).map(v => (
                  <button key={v} onClick={() => setSparkPeriod(v)} style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: sparkPeriod === v ? 'var(--surface)' : 'transparent',
                    color: sparkPeriod === v ? 'var(--text)' : 'var(--muted)',
                    boxShadow: sparkPeriod === v ? 'var(--shadow-soft)' : 'none',
                  }}>{v === 'week' ? 'Sem' : 'Mes'}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              {sparkData.length > 0
                ? <Sparkline data={sparkData} todayIndex={todayIdx} />
                : <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--muted)' }}>Sin datos</div>
              }
            </div>
          </div>
        )}
      </div>

      {/* Top products */}
      <div style={{ padding: '0 22px 14px' }}>
        {isLoading ? <Skel h={220} /> : data ? <TopProducts data={data.topProducts} /> : null}
      </div>

      {/* Hourly chart — desktop */}
      {period === 'today' && (
        <div className="hidden md:block" style={{ padding: '0 22px 24px' }}>
          {isLoading ? <Skel h={240} /> : (
            <div className="card" style={{ padding: '16px 18px' }}>
              <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Pedidos por hora</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-soft)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={(h: number) => `${String(h).padStart(2, '0')}h`} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<HourTooltip />} />
                  <Bar dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Revenue chart — desktop */}
      <div className="hidden md:block" style={{ padding: '0 22px 24px' }}>
        {isLoading ? <Skel h={240} /> : data && data.revenueOverTime.length > 0 ? (
          <div className="card" style={{ padding: '16px 18px' }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Ingresos</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.revenueOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-soft)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} width={48} />
                <Tooltip content={<RevenueTooltip />} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>

      {!isLoading && !error && data && data.totalOrders === 0 && (
        <div style={{ padding: '0 22px 24px' }}>
          <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
            <span className="mat lg" style={{ color: 'var(--muted-soft)', display: 'block', marginBottom: 8 }}>inbox</span>
            <div style={{ fontSize: 14 }}>Sin pedidos en este período</div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  )
}
