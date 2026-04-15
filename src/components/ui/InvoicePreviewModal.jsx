import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import Button from './Button'

export default function InvoicePreviewModal({
  open,
  orderId,
  orderLabel,
  blobUrl,
  loading = false,
  error = '',
  onDownload,
  onClose,
}) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const orderText = orderLabel || (orderId ? `Order #${orderId}` : 'Order')

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="invoice-viewer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-preview-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-slate-950 text-white"
        >
          <header className="flex shrink-0 items-start gap-3 border-b border-white/10 bg-slate-950/95 px-3 py-2 backdrop-blur-sm sm:px-4">
            <div className="min-w-0 flex-1">
              <h2
                id="invoice-preview-title"
                className="text-sm font-semibold sm:text-base"
              >
                Invoice Preview
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">
                {orderText}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close invoice preview"
            >
              <X size={18} />
            </button>
          </header>

          <main className="min-h-0 flex-1 bg-slate-950">
            {loading ? (
              <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Loading invoice
                  </p>
                  <p className="text-xs text-slate-400">
                    Preparing the PDF preview.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="text-3xl font-semibold text-slate-500">PDF</div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Could not load invoice
                  </p>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            ) : blobUrl ? (
              <iframe
                title={`Invoice preview for ${orderText}`}
                src={blobUrl}
                className="block h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[16rem] items-center justify-center px-6 text-center text-sm text-slate-400">
                No invoice preview is available.
              </div>
            )}
          </main>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 bg-slate-950/95 px-3 py-2 backdrop-blur-sm sm:px-4">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onDownload}
              disabled={!blobUrl || loading}
            >
              Download
            </Button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
