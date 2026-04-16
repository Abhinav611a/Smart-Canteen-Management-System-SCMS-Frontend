import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useOrders } from '@/hooks/useOrders'
import { ordersService, canAccessInvoice } from '@/services/orders'
import { formatCurrency } from '@/utils/helpers'
import Button from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'

function formatOrderDate(order) {
  if (order?.formattedDate) return order.formattedDate

  if (!order?.createdAt) return '—'

  const date = new Date(order.createdAt)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrderInvoices() {
  const navigate = useNavigate()
  const { orders, loading } = useOrders('my')
  const [downloadingId, setDownloadingId] = useState(null)

  const invoiceOrders = useMemo(() => {
    return [...orders]
      .filter((order) => canAccessInvoice(order))
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
  }, [orders])

  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingId(orderId)
      await ordersService.downloadInvoice(orderId)
      toast.success('Invoice downloaded successfully.')
    } catch (error) {
      console.error('Invoice download failed:', error)
      toast.error(error?.message || 'Failed to download invoice.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Order Invoice 📄</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Download invoices for any order you have placed.
          </p>
        </div>

        <Button variant="secondary" onClick={() => navigate('/student/orders')}>
          Go to Orders
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={3} />
          ))}
        </div>
      ) : invoiceOrders.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="text-5xl mb-3">🧾</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No invoices available yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Place an order first, then its invoice will appear here.
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate('/student/menu')}>Browse Menu</Button>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoiceOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {order.orderNumber || `#${order.id}`}
                    </p>
                    <span className="badge badge-gray">
                      {order.statusLabel || order.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatOrderDate(order)}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {order.totalItems || order.items?.length || 0} item
                    {(order.totalItems || order.items?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                    {formatCurrency(order.total)}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(order.id)}
                    disabled={downloadingId === order.id}
                    className="px-3 py-1.5 rounded-lg border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                  >
                    {downloadingId === order.id ? 'Downloading...' : 'Download Invoice'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
