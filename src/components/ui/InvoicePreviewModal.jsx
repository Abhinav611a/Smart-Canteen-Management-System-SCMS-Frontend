import Modal, { ModalFooter } from './Modal'
import Button from './Button'

export default function InvoicePreviewModal({
  open,
  orderId,
  orderLabel,
  blobUrl,
  filename,
  loading = false,
  error = '',
  onDownload,
  onClose,
}) {
  const titleLabel = orderLabel || (orderId ? `#${orderId}` : 'Invoice')
  const downloadName = filename || (orderId ? `invoice-${orderId}.pdf` : 'invoice.pdf')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invoice Preview - ${titleLabel}`}
      size="full"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {titleLabel}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {downloadName}
            </p>
          </div>

          {!loading && !error && blobUrl ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              Ready to download
            </span>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-950/40">
          {loading ? (
            <div className="flex h-[55vh] min-h-[20rem] flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500 dark:border-gray-700 dark:border-t-emerald-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Loading invoice preview
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your PDF is being fetched securely.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-[55vh] min-h-[20rem] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="text-4xl">PDF</div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Could not load invoice preview
                </p>
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              </div>
            </div>
          ) : blobUrl ? (
            <div className="h-[55vh] min-h-[20rem] sm:h-[65vh]">
              <iframe
                title={`Invoice preview for ${titleLabel}`}
                src={blobUrl}
                className="h-full w-full bg-white"
              />
            </div>
          ) : (
            <div className="flex h-[55vh] min-h-[20rem] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No invoice preview is available yet.
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          If the PDF does not render in your browser, use Download to open the
          invoice locally.
        </p>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={onDownload}
          disabled={!blobUrl || loading}
        >
          Download
        </Button>
      </ModalFooter>
    </Modal>
  )
}
