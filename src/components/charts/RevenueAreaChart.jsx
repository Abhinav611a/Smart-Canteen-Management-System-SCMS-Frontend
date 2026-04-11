import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCurrency } from '@/utils/helpers'
import { CHART_COLORS } from '@/utils/constants'

const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>
          {isCurrency ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

/**
 * RevenueAreaChart
 * @param {{ data, dataKey, xKey, color, isCurrency, height }} props
 */
export default function RevenueAreaChart({
  data = [],
  dataKey = 'revenue',
  xKey = 'month',
  color = CHART_COLORS.primary,
  isCurrency = true,
  height = 240,
  gradientId = 'areaGrad',
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => isCurrency ? `$${(v / 1000).toFixed(0)}k` : v}
        />
        <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
