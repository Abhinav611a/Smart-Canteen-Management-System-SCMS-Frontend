import { useCallback } from 'react'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { copyToClipboard } from '@/utils/helpers'

function QrCodePreview({ value }) {
  if (!value) {
    return (
      <div className="flex h-[240px] w-[240px] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Scanner URL unavailable.
      </div>
    )
  }

  return (
    <div className="rounded-[2rem] bg-white p-4 shadow-inner">
      <QRCode
        value={value}
        size={240}
        bgColor="#ffffff"
        fgColor="#0f172a"
        className="h-[240px] w-[240px]"
      />
    </div>
  )
}

export default function ManagerPhoneScannerModal({
  open,
  onClose,
  session,
  onDisconnect,
  disconnecting = false,
}) {
  const scannerUrl = String(session?.scannerUrl || '').trim()

  const handleCopy = useCallback(async () => {
    if (!scannerUrl) return

    const copied = await copyToClipboard(scannerUrl)

    if (copied) {
      toast.success('Scanner link copied.')
      return
    }

    toast.error('Unable to copy the scanner link.')
  }, [scannerUrl])

  return (
    <Modal open={open} onClose={onClose} title="Connect Phone Scanner" size="lg">
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Open the external scanner on any phone
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Scan this QR code from the phone camera or open the link directly.
            The phone scanner stays active until you disconnect it or log out.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-slate-200 bg-slate-100 p-6 dark:border-gray-800 dark:bg-slate-950">
          <QrCodePreview value={scannerUrl} />

          <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">
              Scanner URL
            </p>
            <p className="mt-2 break-all text-sm text-slate-700 dark:text-slate-200">
              {scannerUrl || 'Scanner URL unavailable.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => void handleCopy()}>
            Copy Link
          </Button>

          {scannerUrl && (
            <a
              href={scannerUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Open Link
            </a>
          )}

          <Button
            variant="danger"
            onClick={onDisconnect}
            loading={disconnecting}
          >
            Disconnect
          </Button>
        </div>
      </div>
    </Modal>
  )
}
