'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from '@/lib/useWebSocket'
import { PlanGate } from '@/components/admin/PlanGate'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getMetrics, type MetricsPeriod, type MetricsData } from '@/lib/admin-api'
import { formatPrice } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────

type Period = {
  key: MetricsPeriod
  label: string
}

const PERIODS: Period[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'year', label: 'Este año' },
]

// ── KPI Card ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />
  )
}

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      <div
        className="animate-pulse bg-gray-200 rounded-lg"
        style={{ height }}
      />
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name === 'revenue' ? 'Ingresos' : 'Pedidos'}:{' '}
          <span className="font-semibold">
            {entry.name === 'revenue' ? formatPrice(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function ProductTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1 max-w-[180px] break-words">{label}</p>
      <p className="text-orange-600 font-semibold">{payload[0].value} vendidos</p>
    </div>
  )
}

function HourTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const hour = Number(label)
  const display = `${String(hour).padStart(2, '0')}:00 – ${String(hour + 1).padStart(2, '0')}:00`
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{display}</p>
      <p className="text-orange-600 font-semibold">{payload[0].value} pedidos</p>
    </div>
  )
}

// ── Charts ────────────────────────────────────────────────────────────

function RevenueChart({
  data,
  period,
}: {
  data: MetricsData['revenueOverTime']
  period: MetricsPeriod
}) {
  const periodLabels: Record<MetricsPeriod, string> = {
    today: 'Ingresos por hora',
    week: 'Ingresos por día',
    month: 'Ingresos por día',
    year: 'Ingresos por mes',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{periodLabels[period]}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
          Sin datos para este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
              width={48}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#ea580c"
              strokeWidth={2.5}
              dot={data.length <= 12 ? { r: 4, fill: '#ea580c' } : false}
              activeDot={{ r: 6, fill: '#ea580c' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function TopProductsChart({ data }: { data: MetricsData['topProducts'] }) {
  const chartData = data.map((p) => ({
    name:
      p.productName.length > 18
        ? `${p.productName.slice(0, 17)}…`
        : p.productName,
    quantity: p.quantity,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 5 productos</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
          Sin datos para este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip content={<ProductTooltip />} />
            <Bar dataKey="quantity" fill="#ea580c" radius={[0, 6, 6, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function HourlyChart({ data }: { data: MetricsData['ordersByHour'] }) {
  // Rellenar las 24 horas aunque no haya datos
  const filled = Array.from({ length: 24 }, (_, hour) => {
    const found = data.find((d) => d.hour === hour)
    return { hour, orders: found?.orders ?? 0 }
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Pedidos por hora (hoy)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={filled} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(h: number) => `${String(h).padStart(2, '0')}h`}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<HourTooltip />} />
          <Bar dataKey="orders" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

function MetricsPageInner() {
  const [period, setPeriod] = useState<MetricsPeriod>('today')
  const [lastUpdateLabel, setLastUpdateLabel] = useState<string>('')
  useWebSocket()

  const {
    data,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery<MetricsData, Error>({
    queryKey: ['metrics', period],
    queryFn: () => getMetrics(period),
    staleTime: 0,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (!dataUpdatedAt) return
    const update = () => {
      const secs = Math.floor((Date.now() - dataUpdatedAt) / 1000)
      if (secs < 60) setLastUpdateLabel(`hace ${secs}s`)
      else setLastUpdateLabel(`hace ${Math.floor(secs / 60)}min`)
    }
    update()
    const id = setInterval(update, 10_000)
    return () => clearInterval(id)
  }, [dataUpdatedAt])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rendimiento y ventas de tu negocio
            {lastUpdateLabel && (
              <span className="ml-2 text-xs text-gray-400">· Actualizado {lastUpdateLabel}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="self-start sm:self-auto text-sm px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Tabs de período */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              period === p.key
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error.message}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : data ? (
          <>
            <KpiCard
              label="Total pedidos"
              value={String(data.totalOrders)}
              icon="🧾"
            />
            <KpiCard
              label="Ingresos totales"
              value={formatPrice(data.totalRevenue)}
              icon="💰"
            />
            <KpiCard
              label="Ticket promedio"
              value={data.totalOrders > 0 ? formatPrice(data.averageOrderValue) : '—'}
              icon="📊"
            />
            <KpiCard
              label="Clientes únicos"
              value={String(data.totalCustomers)}
              icon="👤"
            />
          </>
        ) : null}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <ChartSkeleton height={260} />
            <ChartSkeleton height={260} />
          </>
        ) : data ? (
          <>
            <RevenueChart data={data.revenueOverTime} period={period} />
            <TopProductsChart data={data.topProducts} />
          </>
        ) : null}
      </div>

      {/* Gráfico horario — solo para "Hoy" */}
      {period === 'today' && (
        <div>
          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : data ? (
            <HourlyChart data={data.ordersByHour} />
          ) : null}
        </div>
      )}

      {/* Empty state si no hay error pero data llega vacía */}
      {!isLoading && !error && data && data.totalOrders === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium text-gray-500">Sin pedidos en este período</p>
          <p className="text-sm mt-1">Los datos aparecerán cuando haya actividad</p>
        </div>
      )}
    </div>
  )
}

export default function MetricsPage() {
  return (
    <PlanGate minPlan="Pro" feature="Métricas">
      <MetricsPageInner />
    </PlanGate>
  )
}
