/**
 * AdminDashboard.jsx
 * ───────────────────
 * Admin overview: live KPIs from /orders + analytics charts + WS updates.

 * FIX BUG-M: no longer calls useOrders('all') — uses analyticsService directly
 *            for revenue KPIs to avoid duplicate API calls with AdminOrders page.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useWebSocket } from '@/hooks/useWebSocket'
import { formatCurrency } from '@/utils/helpers'
import StatCard from '@/components/ui/StatCard'
import RevenueAreaChart from '@/components/charts/RevenueAreaChart'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { CHART_COLORS, PIE_COLORS, ORDER_STATUS } from '@/utils/constants'

export default function AdminDashboard() {
  // Use analytics data — avoids duplicate GET /orders call that AdminOrders also makes
  const { revenue, topItems, categories, statusCounts, loading } = useAnalytics('weekly')

  // Derive KPIs from analytics status counts
  const totalOrders   = statusCounts.reduce((s, sc) => s + (sc.value ?? 0), 0)
  const pendingOrders = statusCounts.find(s => s.name?.toUpperCase() === ORDER_STATUS.PENDING)?.value ?? 0
  const weekRevenue   = revenue.reduce((s, d) => s + (d.revenue ?? 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="section-title">Admin Dashboard ⚙️</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">System overview · Live analytics</p>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: '💰', label: 'Week Revenue',   value: formatCurrency(weekRevenue), trend: 14, color: 'green'  },
            { icon: '📦', label: 'Total Orders',   value: totalOrders,                trend: 8,  color: 'blue'   },
            { icon: '⏳', label: 'Pending Orders', value: pendingOrders,                          color: 'amber'  },
            { icon: '🍽', label: 'Menu Items',     value: topItems.length,                        color: 'violet' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue area chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Revenue This Week</h3>
          <p className="text-xs text-gray-400 mb-4">Daily revenue trend from backend</p>
          <RevenueAreaChart data={revenue} dataKey="revenue" xKey="day" color={CHART_COLORS.primary} isCurrency height={220} />
        </div>

        {/* Order status pie */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Order Status</h3>
          <p className="text-xs text-gray-400 mb-2">Live breakdown</p>
          {statusCounts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusCounts}
                  cx="50%" cy="45%"
                  innerRadius={55} outerRadius={82}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {statusCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Orders']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top items + category mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top items */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Selling Items</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
          ) : topItems.length === 0 ? (
            <p className="text-sm text-gray-400">No sales data yet</p>
          ) : (
            <div className="space-y-2">
              {topItems.slice(0, 6).map((item, i) => {
                const max = topItems[0]?.orders ?? 1
                const pct = max ? Math.round((item.orders / max) * 100) : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                      <span className="truncate">{i + 1}. {item.name}</span>
                      <span className="font-semibold shrink-0 ml-2">{item.orders}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Category mix */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sales by Category</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-7 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat, i) => {
                const total = categories.reduce((s, c) => s + (c.value ?? 0), 0)
                const pct   = total ? Math.round((cat.value / total) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        <span>{cat.name}</span>
                        <span className="font-semibold">{cat.value} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
