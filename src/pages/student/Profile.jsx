/**
 * Profile.jsx — Student profile with real order stats from backend.
 * Blockchain/wallet section removed.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useOrders } from '@/hooks/useOrders'
import { ordersService } from '@/services/orders'
import { getInitials, formatCurrency } from '@/utils/helpers'
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function StudentProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { orders, loading: ordersLoading } = useOrders('my')
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null)

  const totalSpent = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + (o.total ?? 0), 0)

  const completed = orders.filter((o) => o.status === 'COMPLETED').length
  const activeCount = orders.filter((o) =>
    ['PENDING', 'PREPARING', 'READY'].includes(o.status)
  ).length

  const stats = [
    {
      icon: '📦',
      label: 'Total Orders',
      value: orders.length,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: '💰',
      label: 'Total Spent',
      value: formatCurrency(totalSpent),
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: '✅',
      label: 'Completed',
      value: completed,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: '🔄',
      label: 'Active Orders',
      value: activeCount,
      color: 'text-amber-600 dark:text-amber-400',
    },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingInvoiceId(orderId)
      await ordersService.downloadInvoice(orderId)
      toast.success('Invoice downloaded successfully.')
    } catch (error) {
      console.error('Invoice download failed:', error)
      toast.error(error?.message || 'Failed to download invoice.')
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        My Profile 👤
      </h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-3xl font-bold text-white shadow-sm">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {user?.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user?.email}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                {user?.role?.toLowerCase()}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-gray-800 dark:text-slate-300">
                ID #{user?.id}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="hidden items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-400 transition-colors hover:text-red-500 dark:border-red-800 sm:flex"
          >
            Sign out
          </button>
        </div>
      </div>

      {ordersLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Account Details
        </h3>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            {
              label: 'Role',
              value:
                user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1),
            },
            { label: 'User ID', value: `#${user?.id}` },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between border-b border-slate-100 py-2 last:border-0 dark:border-gray-800"
            >
              <span className="text-slate-500 dark:text-slate-400">
                {row.label}
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!ordersLoading && orders.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Order Invoice
            </h3>
            <button
              onClick={() => navigate('/student/invoices')}
              className="text-xs font-medium text-emerald-500 hover:text-emerald-600"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 3).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-gray-800"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {o.orderNumber || `#${o.id}`}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {o.formattedDate ||
                      new Date(o.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(o.total)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(o.id)}
                    disabled={
                      downloadingInvoiceId === o.id ||
                      o.canDownloadInvoice === false
                    }
                    className="rounded-lg border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingInvoiceId === o.id
                      ? 'Downloading...'
                      : 'Invoice'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-400 transition-colors hover:text-red-500 dark:border-red-800 sm:hidden"
      >
        Sign Out
      </button>
    </div>
  )
}