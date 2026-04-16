import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

const AUTO_CLOSE_DELAY_MS = 1500
const SCAN_THROTTLE_MS = 250

function getVerifyErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to verify this QR code right now.'
  )
}

function getCameraErrorMessage(error) {
  const name = String(error?.name || '')

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was blocked. Please allow camera permission and try again.'
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.'
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is busy in another app or tab. Please close it and try again.'
  }

  return 'Unable to start the camera scanner.'
}

function getOrderLabel(result) {
  const id =
    result?.id ??
    result?.orderId ??
    result?.order?.id ??
    result?.data?.id ??
    result?.data?.orderId ??
    result?.data?.order?.id

  if (id != null && String(id).trim()) {
    return `Order #${id}`
  }

  const orderNumber =
    result?.orderNumber ??
    result?.order?.orderNumber ??
    result?.data?.orderNumber ??
    result?.data?.order?.orderNumber

  return orderNumber ? `Order ${orderNumber}` : 'Order verified'
}

function stopStream(stream) {
  if (!stream) return

  stream.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch {
      // Ignore track shutdown errors during modal cleanup.
    }
  })
}

function SpinnerStatusIcon() {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
    </span>
  )
}

function SuccessStatusIcon() {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function ErrorStatusIcon() {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-200">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path d="M12 8v5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
        <path
          d="M10.3 3.84 2.82 17a2 2 0 0 0 1.74 3h14.88a2 2 0 0 0 1.74-3L13.7 3.84a2 2 0 0 0-3.48 0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function CameraStatusIcon() {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path
          d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.2l1.3-1.6A1 1 0 0 1 10.78 4h2.44a1 1 0 0 1 .78.4L15.3 6h2.2A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-7Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3.25" />
      </svg>
    </span>
  )
}

export default function QRScannerModal({ open, onClose, onVerify }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const animationFrameRef = useRef(0)
  const lastScanAtRef = useRef(0)
  const closeTimerRef = useRef(0)
  const processingRef = useRef(false)

  const [phase, setPhase] = useState('idle')
  const [message, setMessage] = useState('')
  const [orderLabel, setOrderLabel] = useState('')
  const [errorSource, setErrorSource] = useState('')

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = 0
    }
  }, [])

  const stopScanner = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }

    const video = videoRef.current
    if (video) {
      video.pause?.()
      video.srcObject = null
    }

    stopStream(streamRef.current)
    streamRef.current = null
    detectorRef.current = null
    lastScanAtRef.current = 0
  }, [])

  const scheduleAutoClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      onClose()
    }, AUTO_CLOSE_DELAY_MS)
  }, [clearCloseTimer, onClose])

  const handleDetectedCode = useCallback(
    async (code) => {
      if (!code || processingRef.current) return

      processingRef.current = true
      stopScanner()
      setPhase('verifying')
      setMessage('Verifying scanned order...')
      setOrderLabel('')
      setErrorSource('')

      try {
        const result = await onVerify(code)

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 60])
        }

        setOrderLabel(getOrderLabel(result))
        setMessage('Successfully collected')
        setPhase('success')
        scheduleAutoClose()
      } catch (error) {
        const errorMessage = getVerifyErrorMessage(error)

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(120)
        }

        toast.error(errorMessage, { id: 'qr-verify-error' })
        setErrorSource('verify')
        setMessage(errorMessage)
        setPhase('error')
        scheduleAutoClose()
      } finally {
        processingRef.current = false
      }
    },
    [onVerify, scheduleAutoClose, stopScanner]
  )

  const scanFrame = useCallback(async () => {
    if (!open || processingRef.current || phase !== 'scanning') return

    animationFrameRef.current = window.requestAnimationFrame(() => {
      void scanFrame()
    })

    const now = Date.now()
    if (now - lastScanAtRef.current < SCAN_THROTTLE_MS) return
    lastScanAtRef.current = now

    const video = videoRef.current
    const detector = detectorRef.current

    if (
      !video ||
      !detector ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return
    }

    try {
      const barcodes = await detector.detect(video)
      const code = barcodes.find((item) => item?.rawValue)?.rawValue

      if (code) {
        void handleDetectedCode(code)
      }
    } catch (error) {
      console.warn('[QR] Scan frame failed:', error)
    }
  }, [handleDetectedCode, open, phase])

  useEffect(() => {
    if (!open) {
      clearCloseTimer()
      processingRef.current = false
      setPhase('idle')
      setMessage('')
      setOrderLabel('')
      setErrorSource('')
      stopScanner()
      return undefined
    }

    let cancelled = false

    const startScanner = async () => {
      setPhase('requesting')
      setMessage('Starting camera...')
      setOrderLabel('')
      setErrorSource('')

      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrorSource('camera')
        setPhase('error')
        setMessage('Camera scanning is not supported in this browser.')
        return
      }

      const BarcodeDetectorCtor = window.BarcodeDetector
      if (!BarcodeDetectorCtor) {
        setErrorSource('camera')
        setPhase('error')
        setMessage('QR scanning is not supported in this browser.')
        return
      }

      try {
        if (typeof BarcodeDetectorCtor.getSupportedFormats === 'function') {
          const supportedFormats = await BarcodeDetectorCtor.getSupportedFormats()
          if (
            Array.isArray(supportedFormats) &&
            supportedFormats.length > 0 &&
            !supportedFormats.includes('qr_code')
          ) {
            setErrorSource('camera')
            setPhase('error')
            setMessage('This browser cannot scan QR codes with the camera.')
            return
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
          },
        })

        if (cancelled) {
          stopStream(stream)
          return
        }

        const video = videoRef.current
        if (!video) {
          stopStream(stream)
          return
        }

        streamRef.current = stream
        detectorRef.current = new BarcodeDetectorCtor({ formats: ['qr_code'] })
        video.srcObject = stream

        await video.play()

        if (cancelled) return

        setPhase('scanning')
        setMessage('Align the QR code inside the frame to verify pickup.')
        animationFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame()
        })
      } catch (error) {
        if (cancelled) return

        const errorMessage = getCameraErrorMessage(error)
        toast.error(errorMessage, { id: 'qr-camera-error' })
        setErrorSource('camera')
        setPhase('error')
        setMessage(errorMessage)
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      clearCloseTimer()
      processingRef.current = false
      stopScanner()
    }
  }, [clearCloseTimer, open, scanFrame, stopScanner])

  const isBusy = phase === 'requesting' || phase === 'verifying'
  const isScanning = phase === 'scanning'
  const isSuccess = phase === 'success'
  const isError = phase === 'error'
  const isVerifyError = isError && errorSource === 'verify'
  const overlayTitle = isSuccess
    ? 'Order Verified'
    : isVerifyError
      ? 'Verification failed'
      : isBusy
        ? phase === 'requesting'
          ? 'Starting camera...'
          : 'Processing scan...'
        : 'Camera scanner unavailable'

  return (
    <Modal
      open={open}
      onClose={() => {
        if (isBusy) return
        onClose()
      }}
      title="Scan Order QR"
      size="lg"
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-inner dark:border-gray-800">
          <div className="relative aspect-[4/3] w-full">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${isScanning ? 'opacity-100' : 'opacity-25'}`}
              autoPlay
              muted
              playsInline
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 max-w-[70%] rounded-[2rem] border-2 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.45)]" />
            </div>

            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 px-6 text-center text-white">
                <div className="space-y-3">
                  {isSuccess ? (
                    <SuccessStatusIcon />
                  ) : isError ? (
                    <ErrorStatusIcon />
                  ) : isBusy ? (
                    <SpinnerStatusIcon />
                  ) : (
                    <CameraStatusIcon />
                  )}

                  {isSuccess ? (
                    <>
                      <p className="text-xl font-bold">{overlayTitle}</p>
                      <p className="text-sm text-emerald-200">{orderLabel}</p>
                      <p className="text-sm text-slate-200">{message}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold">{overlayTitle}</p>
                      <p
                        className={`text-sm ${
                          isVerifyError ? 'text-red-100' : 'text-slate-200'
                        }`}
                      >
                        {message}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {isScanning && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {message}
          </div>
        )}

        {phase === 'verifying' && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Verifying scanned order...
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isBusy}
          >
            {isSuccess ? 'Closing...' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
