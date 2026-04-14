import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CHART_COLORS } from '@/utils/constants'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{payload[0].value}</p>
    </div>
  )
}

export default function OrdersBarChart({
  data = [],
  dataKey = 'orders',
  xKey = 'day',
  color = CHART_COLORS.blue,
  height = 220,
  highlightLast = false,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(156,163,175,0.08)' }} />
        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={highlightLast && i === data.length - 1 ? CHART_COLORS.primary : color}
              fillOpacity={highlightLast && i !== data.length - 1 ? 0.6 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
