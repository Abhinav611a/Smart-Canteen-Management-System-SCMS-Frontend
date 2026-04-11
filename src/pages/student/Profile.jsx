/**
 * Profile.jsx — Student profile with real order stats from backend.
 * Blockchain/wallet section removed.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useOrders } from '@/hooks/useOrders'
import { getInitials, formatCurrency } from '@/utils/helpers'
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function StudentProfile() {
  const { user, logout }                    = useAuth()
  const navigate                            = useNavigate()
  const { orders, loading: ordersLoading }  = useOrders('my')

  const totalSpent  = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.total ?? 0), 0)
  const completed   = orders.filter(o => o.status === 'COMPLETED').length
  const cancelled   = orders.filter(o => o.status === 'CANCELLED').length
  const activeCount = orders.filter(o => ['PENDING','PREPARING','READY'].includes(o.status)).length

  const stats = [
    { icon: '📦', label: 'Total Orders',   value: orders.length,           color: 'text-blue-600  dark:text-blue-400' },
    { icon: '💰', label: 'Total Spent',    value: formatCurrency(totalSpent), color: 'text-green-600 dark:text-green-400' },
    { icon: '✅', label: 'Completed',      value: completed,               color: 'text-brand-600 dark:text-brand-400' },
    { icon: '🔄', label: 'Active Orders',  value: activeCount,             color: 'text-amber-600 dark:text-amber-400' },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h2 className="section-title">My Profile 👤</h2>

      {/* Avatar + info */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-glow">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge badge-green capitalize">{user?.role?.toLowerCase()}</span>
              <span className="badge badge-gray">ID #{user?.id}</span>
            </div>
          </div>
          <button onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-500 border border-red-200 dark:border-red-800 rounded-xl transition-colors">
            Sign out
          </button>
        </div>
      </div>

      {/* Stats */}
      {ordersLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {stats.map(s => (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account details */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Account Details</h3>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Name',  value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role',  value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
            { label: 'User ID', value: `#${user?.id}` },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
              <span className="font-medium text-gray-900 dark:text-white">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders summary */}
      {!ordersLoading && orders.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <button onClick={() => navigate('/student/orders')} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 3).map(o => (
              <div key={o.id} className="flex items-center justify-between text-sm py-1.5">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{o.orderNumber || `#${o.id}`}</span>
                <span className="text-gray-500 dark:text-gray-400">{o.formattedDate || new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile logout */}
      <button onClick={handleLogout}
        className="sm:hidden w-full py-3 text-red-400 hover:text-red-500 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium transition-colors">
        Sign Out
      </button>
    </div>
  )
}
