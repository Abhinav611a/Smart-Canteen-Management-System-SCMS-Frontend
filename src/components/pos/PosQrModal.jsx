import QRCode from 'react-qr-code'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ORDER_STATUS_LABELS } from '@/utils/constants'

export default function PosQrModal({ open, order, onClose }) {
  const orderNumber =
    order?.orderNumber ?? (order?.id != null ? `#${order.id}` : 'POS Order')
  const status =
    order?.statusLabel ??
    ORDER_STATUS_LABELS[String(order?.status || '').toUpperCase()] ??
    order?.status ??
    'Unknown'
  const pickupCode = String(order?.pickupCode || '').trim()
  const canPrint =
    typeof window !== 'undefined' && typeof window.print === 'function'

  return (
    <Modal open={open} onClose={onClose} title="Pickup QR Ready" size="md">
      <div className="space-y-5 text-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Walk-in Order
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {orderNumber}
          </h3>
          <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {status}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          {pickupCode ? (
            <div className="rounded-[1.5rem] bg-white p-4 shadow-inner">
              <QRCode
                value={pickupCode}
                size={220}
                bgColor="#ffffff"
                fgColor="#0f172a"
                className="h-[220px] w-[220px]"
              />
            </div>
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-400">
              QR code unavailable for this order.
            </div>
          )}

          <div className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Pickup Code
            </p>
            <p className="mt-2 break-all text-sm font-medium text-slate-900 dark:text-white">
              {pickupCode || 'Unavailable'}
            </p>
          </div>
        </div>
      </div>

      <ModalFooter>
        {canPrint && (
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        )}
        <Button onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  )
}
