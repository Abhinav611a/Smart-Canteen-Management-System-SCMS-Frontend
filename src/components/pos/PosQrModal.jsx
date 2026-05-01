import React, { useMemo } from 'react'
import QRCode from 'react-qr-code'
import { X, Printer } from 'lucide-react'

export default function PosQrModal({ open, order, onClose }) {
  const qrValue = useMemo(() => order?.pickupCode ?? '', [order])

  if (!open || !order) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl print:shadow-none">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pickup QR</h2>
            <p className="text-sm text-gray-500">
              Order {order.orderNumber || `#${order.id}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="flex justify-center rounded-xl bg-white p-4">
            <QRCode value={qrValue || 'NO_PICKUP_CODE'} size={220} />
          </div>

          <div className="mt-4 space-y-1 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {order.statusLabel || order.status}
            </p>
            <p className="text-sm text-gray-600">
              {order.shortDescription || `${order.totalItems} item(s)`}
            </p>
            <p className="break-all text-xs text-gray-400">{qrValue}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-black"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>
    </div>
  )
}