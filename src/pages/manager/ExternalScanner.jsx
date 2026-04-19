import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { extractQrCodeValue } from '@/services/orders'
import {
  isScannerSessionExpiredError,
  managerScannerService,
} from '@/services/managerScannerService'

const HTML5_QRCODE_SCRIPT_ID = 'external-html5-qrcode-script'
const HTML5_QRCODE_SCRIPT_URL = 'https://unpkg.com/html5-qrcode'
const SCAN_DEBOUNCE_MS = 1800
const FEEDBACK_HOLD_MS = 1400
const SESSION_HEARTBEAT_MS = 15000

let html5QrcodeLoadPromise = null

function getHtml5QrcodeGlobals() {
  if (typeof window === 'undefined') return null

  const Html5Qrcode = window.Html5Qrcode
  const Html5QrcodeSupportedFormats = window.Html5QrcodeSupportedFormats

  if (
    typeof Html5Qrcode === 'function' &&
    Html5QrcodeSupportedFormats &&
    typeof Html5QrcodeSupportedFormats === 'object'
  ) {
    return { Html5Qrcode, Html5QrcodeSupportedFormats }
  }

  return null
}

function loadHtml5QrcodeLibrary() {
  const existingApi = getHtml5QrcodeGlobals()
  if (existingApi) return Promise.resolve(existingApi)
  if (html5QrcodeLoadPromise) return html5QrcodeLoadPromise

  html5QrcodeLoadPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Live scanner is unavailable here.'))
      return
    }

    const handleReady = () => {
      const api = getHtml5QrcodeGlobals()
      if (api) {
        resolve(api)
        return
      }

      reject(new Error('Live scanner is unavailable here.'))
    }

    const handleError = () => {
      reject(new Error('Unable to load the live scanner library.'))
    }

    const existingScript = document.getElementById(HTML5_QRCODE_SCRIPT_ID)
    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = HTML5_QRCODE_SCRIPT_ID
    script.src = HTML5_QRCODE_SCRIPT_URL
    script.async = true
    script.onload = handleReady
    script.onerror = handleError
    document.head.appendChild(script)
  }).catch((error) => {
    html5QrcodeLoadPromise = null
    throw error
  })

  return html5QrcodeLoadPromise
}

function getVerifyErrorMessage(error) {
  const message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to verify this QR code right now.'
  const normalizedMessage = String(message || '').toLowerCase()

  if (
    normalizedMessage.includes('already completed') ||
    normalizedMessage.includes('already collected') ||
    normalizedMessage.includes('already verified')
  ) {
    return 'This order has already been collected.'
  }

  if (normalizedMessage.includes('expired')) {
    return 'This QR code has expired. Please refresh the order QR and try again.'
  }

  if (
    normalizedMessage.includes('tampered') ||
    normalizedMessage.includes('invalid qr')
  ) {
    return 'Invalid QR code. Please scan the latest order QR.'
  }

  return String(message || '').trim() || 'Unable to verify this QR code right now.'
}

function getSessionExpiredMessage(error) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Scanner session expired. Ask the manager to reconnect.'

  return String(message || '').trim() || 'Scanner session expired. Ask the manager to reconnect.'
}

function getCameraErrorMessage(error) {
  const name = String(error?.name || '')
  const text = `${name} ${String(error?.message || error || '')}`.toLowerCase()

  if (
    name === 'NotAllowedError' ||
    text.includes('notallowederror') ||
    text.includes('permission denied')
  ) {
    return 'Camera access is blocked. Allow camera permission and try again.'
  }

  if (
    name === 'NotFoundError' ||
    text.includes('notfounderror') ||
    text.includes('requested device not found')
  ) {
    return 'No camera was found on this device.'
  }

  if (
    name === 'NotReadableError' ||
    text.includes('notreadableerror') ||
    text.includes('device in use')
  ) {
    return 'Camera is busy in another app. Close the other app and try again.'
  }

  return (
    String(error?.message || '').trim() ||
    'Unable to start the camera scanner on this device.'
  )
}

function isValidOrderQrCode(code = '') {
  return String(code || '').includes('|')
}

function getOrderLabel(result) {
  const id =
    result?.id ??
    result?.orderId ??
    result?.order?.id ??
    result?.data?.id ??
    result?.data?.orderId ??
    result?.data?.order?.id

  if (id != null && String(id).trim()) return `Order #${id}`

  const orderNumber =
    result?.orderNumber ??
    result?.order?.orderNumber ??
    result?.data?.orderNumber ??
    result?.data?.order?.orderNumber

  return orderNumber ? `Order ${orderNumber}` : 'Order verified'
}

function StatusGlyph({ phase }) {
  if (phase === 'processing' || phase === 'validating' || phase === 'starting') {
    return (
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
      </span>
    )
  }

  if (phase === 'expired' || phase === 'error') {
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

export default function ExternalScanner() {
  const [searchParams] = useSearchParams()
  const token = String(searchParams.get('token') || '').trim()
  console.log('[ExternalScanner] Component rendered')
  const scannerContainerRef = useRef(null)
  const scannerContainerIdRef = useRef(
    `external-manager-scanner-${Math.random().toString(36).slice(2, 10)}`,
  )
  const html5QrcodeRef = useRef(null)
  const html5QrcodeRunningRef = useRef(false)
  const processingRef = useRef(false)
  const phaseRef = useRef(token ? 'validating' : 'expired')
  const lastScanValueRef = useRef('')
  const lastScanAtRef = useRef(0)
  const feedbackTimerRef = useRef(0)
  const validatingRef = useRef(false)

  const [restartKey, setRestartKey] = useState(0)
  const [phase, setPhase] = useState(token ? 'validating' : 'expired')
  const [bannerTone, setBannerTone] = useState(token ? 'info' : 'error')
  const [bannerTitle, setBannerTitle] = useState(
    token ? 'Validating session' : 'Scanner session invalid',
  )
  const [bannerMessage, setBannerMessage] = useState(
    token
      ? 'Checking whether this scanner session is still active...'
      : 'This scanner link is missing a session token. Ask the manager to reconnect.',
  )
  const [lastResultLabel, setLastResultLabel] = useState('')
  const [sessionInfo, setSessionInfo] = useState(null)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = 0
    }
  }, [])

  const stopScanner = useCallback(async () => {
    const activeScanner = html5QrcodeRef.current
    const wasRunning = html5QrcodeRunningRef.current

    html5QrcodeRef.current = null
    html5QrcodeRunningRef.current = false

    if (!activeScanner) return

    try {
      if (wasRunning && typeof activeScanner.stop === 'function') {
        await activeScanner.stop()
      }
    } catch (error) {
      console.warn('[external-scanner] Failed to stop scanner:', error)
    }

    try {
      if (typeof activeScanner.clear === 'function') {
        await activeScanner.clear()
      }
    } catch (error) {
      console.warn('[external-scanner] Failed to clear scanner:', error)
    }
  }, [])

  const setReadyBanner = useCallback(() => {
    setBannerTone('info')
    setBannerTitle('Scanner ready')
    setBannerMessage('Point the camera at the next order QR code.')
    setLastResultLabel('')
  }, [])

  const expireSession = useCallback(
    async (error) => {
      clearFeedbackTimer()
      processingRef.current = false
      validatingRef.current = false
      await stopScanner()
      setPhase('expired')
      setBannerTone('error')
      setBannerTitle('Scanner session expired')
      setBannerMessage(getSessionExpiredMessage(error))
      setLastResultLabel('')
      toast.error('Scanner session expired. Ask the manager to reconnect.', {
        id: 'external-scanner-expired',
      })
    },
    [clearFeedbackTimer, stopScanner],
  )

  const scheduleReadyBanner = useCallback(() => {
    clearFeedbackTimer()
    feedbackTimerRef.current = window.setTimeout(() => {
      if (!processingRef.current && html5QrcodeRunningRef.current) {
        setReadyBanner()
      }
    }, FEEDBACK_HOLD_MS)
  }, [clearFeedbackTimer, setReadyBanner])

  const handleDetectedCode = useCallback(
    async (rawCode) => {
      if (
        phaseRef.current === 'expired' ||
        phaseRef.current === 'error' ||
        processingRef.current
      ) {
        return
      }

      const normalizedCode = extractQrCodeValue(rawCode)
      if (!normalizedCode) return

      const now = Date.now()
      const isDuplicateScan =
        lastScanValueRef.current === normalizedCode &&
        now - lastScanAtRef.current < SCAN_DEBOUNCE_MS

      if (isDuplicateScan) return

      lastScanValueRef.current = normalizedCode
      lastScanAtRef.current = now
      processingRef.current = true
      clearFeedbackTimer()
      setPhase('processing')
      setBannerTone('info')
      setBannerTitle('Verifying order')
      setBannerMessage('Sending this scan to the backend...')
      setLastResultLabel('')

      if (!isValidOrderQrCode(normalizedCode)) {
        const invalidMessage =
          'Invalid QR code format. Scan the latest order QR and try again.'

        setPhase('scanning')
        setBannerTone('error')
        setBannerTitle('Scan failed')
        setBannerMessage(invalidMessage)
        toast.error(invalidMessage, { id: 'external-scanner-invalid-qr' })

        window.setTimeout(() => {
          processingRef.current = false
          scheduleReadyBanner()
        }, FEEDBACK_HOLD_MS)
        return
      }

      try {
        const result = await managerScannerService.verifyOrder(normalizedCode, token)

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 60])
        }

        setPhase('scanning')
        setBannerTone('success')
        setBannerTitle('Order verified')
        setBannerMessage('Verification complete. Ready for the next scan.')
        setLastResultLabel(getOrderLabel(result))
        toast.success(`${getOrderLabel(result)} verified.`, {
          id: 'external-scanner-success',
        })
      } catch (error) {
        if (isScannerSessionExpiredError(error)) {
          await expireSession(error)
          return
        }

        const errorMessage = getVerifyErrorMessage(error)

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(120)
        }

        setPhase('scanning')
        setBannerTone('error')
        setBannerTitle('Verification failed')
        setBannerMessage(`${errorMessage} Ready for the next scan.`)
        setLastResultLabel('')
        toast.error(errorMessage, { id: 'external-scanner-error' })
      } finally {
        window.setTimeout(() => {
          processingRef.current = false
          scheduleReadyBanner()
        }, FEEDBACK_HOLD_MS)
      }
    },
    [clearFeedbackTimer, expireSession, scheduleReadyBanner, token],
  )

  useEffect(() => {
    console.log('[ExternalScanner] Init effect entered')
    if (!token) return undefined

    let cancelled = false

    const bootScanner = async () => {
      try {
        processingRef.current = false
        lastScanValueRef.current = ''
        lastScanAtRef.current = 0
        setPhase('validating')
        setBannerTone('info')
        setBannerTitle('Validating session')
        setBannerMessage('Checking whether this scanner session is still active...')
        setLastResultLabel('')

        const session = await managerScannerService.validateSession(token)
        if (cancelled) return

        setSessionInfo(session)
        setPhase('starting')
        setBannerTone('info')
        setBannerTitle('Starting camera')
        setBannerMessage('Allow camera access if your browser asks for permission.')

        const scannerCameraConstraints = { facingMode: 'environment' }
        const scannerStartConfig = {
          fps: 12,
          aspectRatio: 4 / 3,
          disableFlip: false,
        }

        // Temporary debugging logs to diagnose external scanner startup issues.
        console.log('[ExternalScanner] Starting scanner...', {
          hasMediaDevices:
            typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices),
          hasGetUserMedia:
            typeof navigator !== 'undefined' &&
            typeof navigator.mediaDevices?.getUserMedia === 'function',
          scannerContainerId: scannerContainerIdRef.current,
          constraints: scannerCameraConstraints,
          config: scannerStartConfig,
        })

        const { Html5Qrcode, Html5QrcodeSupportedFormats } =
          await loadHtml5QrcodeLibrary()
        if (cancelled) return

        const container = scannerContainerRef.current
        console.log('[ExternalScanner] Scanner prerequisites resolved', {
          hasHtml5Qrcode: typeof Html5Qrcode === 'function',
          hasSupportedFormats: Boolean(Html5QrcodeSupportedFormats),
          hasContainer: Boolean(container),
        })

        if (!container) {
          throw new Error('Scanner view is not ready yet.')
        }

        container.innerHTML = ''

        const scanner = new Html5Qrcode(scannerContainerIdRef.current, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: false,
          },
          verbose: false,
        })

        html5QrcodeRef.current = scanner

        await scanner.start(
          scannerCameraConstraints,
          scannerStartConfig,
          (decodedText) => {
            void handleDetectedCode(decodedText)
          },
          () => {
            // Ignore frame-level decode misses and keep scanning.
          },
        )

        if (cancelled) {
          await stopScanner()
          return
        }

        html5QrcodeRunningRef.current = true
        console.log('[ExternalScanner] Scanner started successfully', {
          constraints: scannerCameraConstraints,
          config: scannerStartConfig,
        })
        setPhase('scanning')
        setReadyBanner()
      } catch (error) {
        if (cancelled) return

        console.error('[ExternalScanner] Scanner failed to start:', error)
        console.log('[ExternalScanner] Scanner startup diagnostics', {
          hasMediaDevices:
            typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices),
          hasGetUserMedia:
            typeof navigator !== 'undefined' &&
            typeof navigator.mediaDevices?.getUserMedia === 'function',
          scannerContainerId: scannerContainerIdRef.current,
          hasContainer: Boolean(scannerContainerRef.current),
        })

        if (isScannerSessionExpiredError(error)) {
          await expireSession(error)
          return
        }

        await stopScanner()
        setPhase('error')
        setBannerTone('error')
        setBannerTitle('Unable to start scanner')
        setBannerMessage(getCameraErrorMessage(error))
        setLastResultLabel('')
      }
    }

    void bootScanner()

    return () => {
      cancelled = true
      clearFeedbackTimer()
      validatingRef.current = false
      processingRef.current = false
      void stopScanner()
    }
  }, [
    clearFeedbackTimer,
    expireSession,
    handleDetectedCode,
    restartKey,
    setReadyBanner,
    stopScanner,
    token,
  ])

  useEffect(() => {
    if (!token || phase === 'expired' || phase === 'error') {
      return undefined
    }

    const intervalId = window.setInterval(async () => {
      if (validatingRef.current || processingRef.current) return

      validatingRef.current = true

      try {
        await managerScannerService.validateSession(token)
      } catch (error) {
        if (isScannerSessionExpiredError(error)) {
          await expireSession(error)
        }
      } finally {
        validatingRef.current = false
      }
    }, SESSION_HEARTBEAT_MS)

    return () => {
      window.clearInterval(intervalId)
      validatingRef.current = false
    }
  }, [expireSession, phase, token])

  const isPreviewVisible = phase === 'scanning' || phase === 'processing'
  const bannerStyles =
    bannerTone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
      : bannerTone === 'error'
        ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'
        : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">
                Manager Pickup Scanner
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                External Phone Scanner
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Keep this page open on the phone. Each successful scan is sent
                directly to the backend and the camera resumes automatically for
                the next order.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
              {phase === 'expired'
                ? 'Session expired'
                : phase === 'error'
                  ? 'Scanner unavailable'
                  : 'Session active'}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <div
              id={scannerContainerIdRef.current}
              ref={scannerContainerRef}
              className={`h-full w-full bg-slate-950 transition-opacity duration-300 ${
                isPreviewVisible ? 'opacity-100' : 'opacity-25'
              } [&>*]:h-full [&>*]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover`}
            />

            <div className="pointer-events-none absolute inset-5 rounded-[2rem] border border-white/15 sm:inset-8">
              <div className="absolute left-0 top-0 h-12 w-12 rounded-tl-[2rem] border-l-4 border-t-4 border-white/85" />
              <div className="absolute right-0 top-0 h-12 w-12 rounded-tr-[2rem] border-r-4 border-t-4 border-white/85" />
              <div className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-[2rem] border-b-4 border-l-4 border-white/85" />
              <div className="absolute bottom-0 right-0 h-12 w-12 rounded-br-[2rem] border-b-4 border-r-4 border-white/85" />
            </div>

            {!isPreviewVisible && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/72 px-6 text-center">
                <div className="space-y-3">
                  <StatusGlyph phase={phase} />
                  <p className="text-xl font-semibold text-white">{bannerTitle}</p>
                  <p className="max-w-md text-sm text-slate-200">
                    {bannerMessage}
                  </p>
                  {lastResultLabel && (
                    <p className="text-sm font-semibold text-emerald-200">
                      {lastResultLabel}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-[2rem] border px-5 py-4 ${bannerStyles}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">
            {bannerTitle}
          </p>
          <p className="mt-2 text-sm">{bannerMessage}</p>
          {lastResultLabel && (
            <p className="mt-2 text-sm font-semibold">{lastResultLabel}</p>
          )}
          {sessionInfo?.expiresAt && phase !== 'expired' && (
            <p className="mt-3 text-xs text-current/80">
              Session expires at {new Date(sessionInfo.expiresAt).toLocaleString()}.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {(phase === 'error' || phase === 'expired') && (
            <Button
              variant="secondary"
              onClick={() => {
                setRestartKey((value) => value + 1)
                setPhase(token ? 'validating' : 'expired')
              }}
            >
              Try Again
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  )
}
