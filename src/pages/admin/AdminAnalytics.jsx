import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useAnalytics } from '@/hooks/useAnalytics'
import { formatCurrency } from '@/utils/helpers'
import StatCard from '@/components/ui/StatCard'
import RevenueAreaChart from '@/components/charts/RevenueAreaChart'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { CHART_COLORS, PIE_COLORS } from '@/utils/constants'

const T = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const PERIODS = ['weekly', 'monthly']

export default function AdminAnalytics() {
  const [period, setPeriod]         = useState('monthly')
  const { revenue, topItems, vendors, categories, statusCounts, loading } = useAnalytics(period)

  const xKey = period === 'monthly' ? 'month' : 'day'
  const totalRevenue = revenue.reduce((s, d) => s + (d.revenue || 0), 0)
  const avgRevenue   = revenue.length ? totalRevenue / revenue.length : 0
  const totalOrders  = (statusCounts ?? []).reduce((s, sc) => s + (sc.value ?? 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="section-title">Analytics 📈</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenue, orders & category insights</p>
      </div>

      {/* Summary KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="💰" label={`${period === 'monthly' ? '7-Month' : 'Weekly'} Revenue`} value={formatCurrency(totalRevenue)} trend={18} color="green" />
          <StatCard icon="📅" label="Avg Revenue"   value={formatCurrency(avgRevenue)}                                                  trend={6}  color="blue"   />
          <StatCard icon="📦" label="Total Orders"   value={totalOrders}                                                                            color="amber"  />
          <StatCard icon="🍽" label="Top Selling"    value={topItems[0]?.name ?? '—'}                                                               color="violet" />
        </div>
      )}

      {/* Revenue trend with period toggle */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
            <p className="text-xs text-gray-400 mt-0.5">Income over time</p>
          </div>
          <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <RevenueAreaChart
          data={revenue}
          dataKey="revenue"
          xKey={xKey}
          color={CHART_COLORS.primary}
          isCurrency
          height={260}
        />
      </div>

      {/* Two charts side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category pie */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Sales by Category</h3>
          <p className="text-xs text-gray-400 mb-3">Share of total revenue</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categories}
                cx="50%" cy="45%"
                innerRadius={70} outerRadius={105}
                paddingAngle={5}
                dataKey="value"
              >
                {categories.map((entry, i) => (
                  <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={10} formatter={v => <span style={{ fontSize: 12, color: '#9ca3af' }}>{v}</span>} />
              <Tooltip formatter={v => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top items horizontal bar */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Top Items by Revenue</h3>
          <p className="text-xs text-gray-400 mb-3">Best performing menu items</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topItems} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={130}
              />
              <Tooltip content={<T />} />
              <Bar dataKey="orders" fill={CHART_COLORS.blue} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Sales — replaces "Vendor Performance" (no /analytics/vendors endpoint) */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">🍽 Category Sales</h3>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th><th>Total Orders</th><th>Share</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v, i) => {
                  const totalVendorOrders = vendors.reduce((s, x) => s + (x.value ?? 0), 0)
                  const sharePercent  = totalVendorOrders ? Math.round(((v.value ?? 0) / totalVendorOrders) * 100) : 0
                  return (
                    <tr key={v.name}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          >
                            {v.name[0]}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{v.name}</span>
                        </div>
                      </td>
                      <td className="font-semibold">{(v.value ?? 0).toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${sharePercent}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{sharePercent}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Status Breakdown */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">📊 Order Status Breakdown</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders',   value: totalOrders,                                                                               icon: '📦', color: CHART_COLORS.blue    },
            { label: 'Total Revenue',  value: formatCurrency(totalRevenue),                                                              icon: '💰', color: CHART_COLORS.primary },
            { label: 'Avg Revenue',    value: formatCurrency(avgRevenue),                                                                icon: '📅', color: CHART_COLORS.amber   },
            { label: 'Top Category',   value: categories[0]?.name ?? '—',                                                               icon: '🍽', color: CHART_COLORS.cyan    },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
