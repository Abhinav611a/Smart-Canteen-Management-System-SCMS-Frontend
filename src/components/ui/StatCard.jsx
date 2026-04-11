import React from 'react'

export default function StatCard({ icon, label, value, sub, trend, color = 'green' }) {
  const colors = {
    green:  'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    blue:   'bg-blue-100  dark:bg-blue-900/20  text-blue-600  dark:text-blue-400',
    amber:  'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    rose:   'bg-rose-100  dark:bg-rose-900/20  text-rose-600  dark:text-rose-400',
    violet: 'bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  }

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0
              ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
              : 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
