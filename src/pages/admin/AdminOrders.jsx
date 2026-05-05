import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useOrders } from '@/hooks/useOrders'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useWebSocket } from '@/hooks/useWebSocket'
import { formatCurrency } from '@/utils/helpers'
import {
  ENDPOINTS,
  ORDER_STATUS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/utils/constants'
import Pagination from '@/components/ui/Pagination'
import { SkeletonTable } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import {
  BadgeCheck,
  CheckCircle2,
  CircleX,
  ClipboardList,
  Clock3,
  IndianRupee,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-react'

const EXTRA_STATUS = 'PAYMENT_PENDING'
const STATUSES = ['ALL', ...new Set([EXTRA_STATUS, ...Object.values(ORDER_STATUS)])]
const UTC_TIMESTAMP_WITHOUT_ZONE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/

function StatusIcon({ status, className = 'h-3.5 w-3.5' }) {
  const icons = {
    [ORDER_STATUS.PENDING]: Clock3,
    [ORDER_STATUS.PREPARING]: RefreshCw,
    [ORDER_STATUS.READY]: BadgeCheck,
    [ORDER_STATUS.COMPLETED]: CheckCircle2,
    [ORDER_STATUS.CANCELLED]: CircleX,
    [EXTRA_STATUS]: IndianRupee,
  }
  const Icon = icons[status] || Clock3
  return <Icon className={className} aria-hidden="true" />
}

function isPaymentPending(order) {
  const directStatus = String(order?.status ?? '').toUpperCase()
  const paymentStatus = String(
    order?.paymentStatus ??
      order?.payment_state ??
      order?.payment ??
      ''
  ).toUpperCase()

  return directStatus === EXTRA_STATUS || paymentStatus === EXTRA_STATUS
}

function getDisplayStatus(order) {
  if (isPaymentPending(order)) return EXTRA_STATUS
  return String(order?.status ?? '').toUpperCase()
}

function getOrderKey(order, index) {
  if (order?.id !== undefined && order?.id !== null && order?.id !== '') {
    return `order-${order.id}`
  }

  if (order?.orderNumber) {
    return `order-number-${order.orderNumber}`
  }

  if (order?.createdAt) {
    return `fallback-${order.createdAt}-${index}`
  }

  return `fallback-row-${index}`
}

function formatAdminOrderDateTime(value) {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  const normalized = UTC_TIMESTAMP_WITHOUT_ZONE.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminOrders() {
  const { orders = [], loading, error, refetch } = useOrders('all')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [rawSearch, setRawSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const search = useDebounce(rawSearch, 300)

  const { isConnected } = useWebSocket('admin:orders', () => {
    refetch()
  })

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const displayStatus = getDisplayStatus(o)
      const matchStatus =
        statusFilter === 'ALL' || displayStatus === statusFilter

      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        String(o?.id ?? '').toLowerCase().includes(q) ||
        String(o?.orderNumber ?? '').toLowerCase().includes(q) ||
        String(o?.studentName ?? '').toLowerCase().includes(q) ||
        (Array.isArray(o?.items)
          ? o.items.map((i) => i?.name ?? '').join(', ').toLowerCase()
          : ''
        ).includes(q)

      return matchStatus && matchSearch
    })
  }, [orders, statusFilter, search])

  const {
    page,
    totalPages,
    paginated,
    goTo,
    next,
    prev,
    canNext,
    canPrev,
    reset,
  } = usePagination(filtered, 10)

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    reset()
  }

  const handleApprove = async (order) => {
    try {
      setActionLoading(`approve-${order.id}`)
      await api.patch(ENDPOINTS.ADMIN_APPROVE_PAYMENT(order.id))

      toast.success(
        `Payment approved for ${order.orderNumber || `#${order.id}`}`
      )

      await refetch()
    } catch (e) {
      console.error('Approve failed:', e)
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          'Failed to approve payment'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (order) => {
    toast.error(
      `Reject API is not configured for ${order.orderNumber || `#${order.id}`}`
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="section-title inline-flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-brand-500" aria-hidden="true" />
          All Orders
        </h2>
        <div className="glass-card p-4">
          <SkeletonTable rows={8} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <TriangleAlert className="mx-auto mb-3 h-12 w-12 text-amber-500" aria-hidden="true" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <Button variant="secondary" onClick={refetch}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title inline-flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand-500" aria-hidden="true" />
            All Orders
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} orders {statusFilter !== 'ALL' ? `(${statusFilter})` : ''}
            </p>

            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live updates
              </span>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={refetch} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />

          <input
            className="input-field pl-10"
            placeholder="Search by ID, name, or tx hash…"
            value={rawSearch}
            onChange={(e) => {
              setRawSearch(e.target.value)
              reset()
            }}
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map((status) => (
            <button
              key={`status-filter-${status}`}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-brand-500 text-white shadow-glow'
                  : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {status !== 'ALL' && (
                <StatusIcon status={status} className="mr-1 inline h-3.5 w-3.5" />
              )}
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Student</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((order, index) => {
                const displayStatus = getDisplayStatus(order)
                const statusKey = String(order?.status ?? '').toUpperCase()

                const cfg = {
                  color: ORDER_STATUS_COLORS[statusKey] ?? 'badge-gray',
                  label:
                    order?.statusLabel ||
                    ORDER_STATUS_LABELS[statusKey] ||
                    statusKey ||
                    'UNKNOWN',
                }

                return (
                  <tr key={getOrderKey(order, index)} className="group">
                    <td className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {order?.orderNumber || `#${order?.id ?? 'N/A'}`}
                    </td>

                    <td>{order?.studentName || '-'}</td>

                    <td className="text-xs text-gray-500 dark:text-gray-400 max-w-[140px] truncate">
                      {Array.isArray(order?.items)
                        ? order.items
                            .map((i) => i?.name)
                            .filter(Boolean)
                            .join(', ')
                        : '-'}
                    </td>

                    <td className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(order?.total ?? 0)}
                    </td>

                    <td>
                      {displayStatus === EXTRA_STATUS ? (
                        <span className="badge badge-gray">
                          <IndianRupee className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                          PAYMENT_PENDING
                        </span>
                      ) : (
                        <span className={`badge ${cfg.color}`}>
                          <StatusIcon status={statusKey} className="mr-1 inline h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                      )}
                    </td>

                    <td>
                      {displayStatus === EXTRA_STATUS ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(order)}
                            disabled={actionLoading === `approve-${order.id}`}
                            className="px-3 py-1 rounded-lg bg-green-500 text-black text-xs font-medium hover:bg-green-400 disabled:opacity-60"
                          >
                            {actionLoading === `approve-${order.id}`
                              ? 'Approving...'
                              : 'Approve'}
                          </button>

                          <button
                            onClick={() => handleReject(order)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-400 disabled:opacity-60"
                          >
                            {actionLoading === `reject-${order.id}`
                              ? 'Rejecting...'
                              : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    <td className="text-xs text-gray-400 whitespace-nowrap">
                      {formatAdminOrderDateTime(order?.createdAt) ||
                        order?.formattedDate ||
                        '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {paginated.length === 0 && (
          <div className="text-center py-14">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm text-gray-400">
              No orders match your filter.
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages} · {filtered.length} results
            </p>

            <Pagination
              page={page}
              totalPages={totalPages}
              onNext={next}
              onPrev={prev}
              onGoTo={goTo}
              canNext={canNext}
              canPrev={canPrev}
            />
          </div>
        )}
      </div>
    </div>
  )
}
