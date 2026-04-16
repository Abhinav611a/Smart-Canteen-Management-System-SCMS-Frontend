import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

const AUTO_CLOSE_DELAY_MS = 1500
const SCAN_THROTTLE_MS = 250
const CAMERA_STARTUP_PHASES = [
  'checking-support',
  'checking-permission',
  'prompting-permission',
  'requesting-camera',
]
const CAMERA_HELP_ITEMS = [
  'Allow camera access from your browser site settings for this page.',
  'Check the lock or site icon near the address bar and enable Camera access.',
  'Close other apps or tabs using the camera, such as Zoom, Meet, or Teams.',
  'Try Chrome, Edge, or a mobile device if this browser limits in-app scanning.',
  'Use an external scanner if your setup provides one.',
]

function getVerifyErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to verify this QR code right now.'
  )
}

function createCameraIssue(type, overrides = {}) {
  const issues = {
    'unsupported-browser': {
      title: 'Camera not supported',
      message:
        'This browser does not support the camera APIs required for in-app QR scanning.',
    },
    'scanner-unsupported': {
      title: 'Live QR scanning not supported',
      message:
        'Camera access is available, but this browser cannot run in-app QR scanning here.',
    },
    'permission-denied': {
      title: 'Camera permission blocked',
      message:
        'Camera permission is blocked. Please allow access in your browser settings.',
    },
    'no-camera': {
      title: 'No camera found',
      message: 'No camera device was found on this system.',
    },
    'camera-busy': {
      title: 'Camera unavailable',
      message: 'Camera is currently in use by another application.',
    },
    'unsupported-constraints': {
      title: 'Camera configuration unsupported',
      message:
        'The preferred camera could not be started on this device. Please try again.',
    },
    'security-blocked': {
      title: 'Camera blocked by browser security',
      message:
        'Camera access is blocked by browser or page security settings. Use HTTPS or localhost and allow camera access.',
    },
    'init-failed': {
      title: 'Unable to initialize camera',
      message: 'Unable to initialize camera. Please try again.',
    },
  }

  return {
    type,
    ...(issues[type] || issues['init-failed']),
    ...overrides,
  }
}

function checkCameraSupport() {
  const hasMediaDevices =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices === 'object' &&
    navigator.mediaDevices !== null
  const hasGetUserMedia =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  const hasBarcodeDetector =
    typeof window !== 'undefined' &&
    typeof window.BarcodeDetector !== 'undefined'
  const isSecureContext =
    typeof window === 'undefined' ? true : window.isSecureContext !== false

  return {
    hasMediaDevices,
    hasGetUserMedia,
    hasBarcodeDetector,
    isSecureContext,
    canUseCamera: hasMediaDevices && hasGetUserMedia,
  }
}

async function getCameraPermissionState() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.permissions ||
    typeof navigator.permissions.query !== 'function'
  ) {
    return 'unsupported'
  }

  try {
    const result = await navigator.permissions.query({ name: 'camera' })
    return result?.state || 'unsupported'
  } catch {
    return 'unsupported'
  }
}

async function isQrCodeFormatSupported(BarcodeDetectorCtor) {
  if (
    !BarcodeDetectorCtor ||
    typeof BarcodeDetectorCtor.getSupportedFormats !== 'function'
  ) {
    return true
  }

  try {
    const supportedFormats = await BarcodeDetectorCtor.getSupportedFormats()

    if (!Array.isArray(supportedFormats) || supportedFormats.length === 0) {
      return true
    }

    return supportedFormats.includes('qr_code')
  } catch {
    return true
  }
}

function isConstraintError(error) {
  const name = String(error?.name || '')
  return (
    name === 'OverconstrainedError' ||
    name === 'ConstraintNotSatisfiedError'
  )
}

function classifyCameraError(error, { permissionState = 'unknown' } = {}) {
  const name = String(error?.name || '')

  if (name === 'NotAllowedError') {
    return createCameraIssue('permission-denied', {
      permissionState,
      originalError: error,
    })
  }

  if (name === 'SecurityError') {
    return createCameraIssue('security-blocked', {
      permissionState,
      originalError: error,
    })
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return createCameraIssue('no-camera', {
      permissionState,
      originalError: error,
    })
  }

  if (
    name === 'NotReadableError' ||
    name === 'TrackStartError' ||
    name === 'AbortError'
  ) {
    return createCameraIssue('camera-busy', {
      permissionState,
      originalError: error,
    })
  }

  if (isConstraintError(error)) {
    return createCameraIssue('unsupported-constraints', {
      permissionState,
      originalError: error,
    })
  }

  return createCameraIssue('init-failed', {
    permissionState,
    originalError: error,
  })
}

async function requestCameraAccess({ permissionState = 'unknown' } = {}) {
  const preferredConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
    },
  }

  try {
    return await navigator.mediaDevices.getUserMedia(preferredConstraints)
  } catch (error) {
    if (isConstraintError(error)) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        })
      } catch (fallbackError) {
        throw classifyCameraError(fallbackError, { permissionState })
      }
    }

    throw classifyCameraError(error, { permissionState })
  }
}

function formatPermissionState(permissionState) {
  switch (permissionState) {
    case 'granted':
      return 'Granted'
    case 'prompt':
      return 'Awaiting prompt'
    case 'denied':
      return 'Blocked'
    case 'unsupported':
      return 'Unavailable'
    default:
      return 'Unknown'
  }
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
  const [permissionState, setPermissionState] = useState('unknown')
  const [cameraIssue, setCameraIssue] = useState(null)
  const [startAttempt, setStartAttempt] = useState(0)

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = 0
    }
  }, [])

  const resetCameraState = useCallback(() => {
    setMessage('')
    setOrderLabel('')
    setErrorSource('')
    setPermissionState('unknown')
    setCameraIssue(null)
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

  const setCameraFailure = useCallback((issue) => {
    setErrorSource('camera')
    setCameraIssue(issue)
    setMessage(issue.message)
    setOrderLabel('')
    setPhase('error')
  }, [])

  const handleRetryCamera = useCallback(() => {
    clearCloseTimer()
    processingRef.current = false
    stopScanner()
    resetCameraState()
    setPhase('idle')
    setStartAttempt((value) => value + 1)
  }, [clearCloseTimer, resetCameraState, stopScanner])

  const handleDetectedCode = useCallback(
    async (code) => {
      if (!code || processingRef.current) return

      processingRef.current = true
      stopScanner()
      setPhase('verifying')
      setMessage('Verifying scanned order...')
      setOrderLabel('')
      setErrorSource('')
      setCameraIssue(null)

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
        setCameraIssue(null)
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
      resetCameraState()
      stopScanner()
      return undefined
    }

    let cancelled = false

    const startScanner = async () => {
      resetCameraState()
      setPhase('checking-support')
      setMessage('Checking camera support...')

      const support = checkCameraSupport()

      if (!support.canUseCamera) {
        if (cancelled) return

        setCameraFailure(
          support.isSecureContext
            ? createCameraIssue('unsupported-browser')
            : createCameraIssue('security-blocked')
        )
        return
      }

      const BarcodeDetectorCtor = window.BarcodeDetector

      if (!support.hasBarcodeDetector) {
        if (cancelled) return
        setCameraFailure(createCameraIssue('scanner-unsupported'))
        return
      }

      const qrFormatSupported = await isQrCodeFormatSupported(BarcodeDetectorCtor)

      if (cancelled) return

      if (!qrFormatSupported) {
        setCameraFailure(createCameraIssue('scanner-unsupported'))
        return
      }

      setPhase('checking-permission')
      setMessage('Checking camera permission...')

      const resolvedPermissionState = await getCameraPermissionState()

      if (cancelled) return

      setPermissionState(resolvedPermissionState)

      if (resolvedPermissionState === 'denied') {
        setCameraFailure(
          createCameraIssue('permission-denied', {
            permissionState: resolvedPermissionState,
          })
        )
        return
      }

      if (
        resolvedPermissionState === 'prompt' ||
        resolvedPermissionState === 'unsupported'
      ) {
        setPhase('prompting-permission')
        setMessage('To scan QR codes, please allow camera access.')
      } else {
        setPhase('requesting-camera')
        setMessage('Starting camera...')
      }

      try {
        const stream = await requestCameraAccess({
          permissionState: resolvedPermissionState,
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

        if (resolvedPermissionState !== 'granted') {
          setPermissionState('granted')
        }

        setPhase('requesting-camera')
        setMessage('Starting camera...')

        await video.play()

        if (cancelled) {
          stopStream(stream)
          return
        }

        setPhase('scanning')
        setMessage('Align the QR code inside the frame to verify pickup.')
        animationFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame()
        })
      } catch (error) {
        if (cancelled) return

        const issue =
          error?.type && error?.message
            ? error
            : classifyCameraError(error, {
                permissionState: resolvedPermissionState,
              })

        setCameraFailure(issue)
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      clearCloseTimer()
      processingRef.current = false
      stopScanner()
    }
  }, [
    clearCloseTimer,
    open,
    resetCameraState,
    scanFrame,
    setCameraFailure,
    startAttempt,
    stopScanner,
  ])

  const isStartingCamera = CAMERA_STARTUP_PHASES.includes(phase)
  const isPreparingCamera = phase === 'idle' || isStartingCamera
  const isVerifying = phase === 'verifying'
  const isScanning = phase === 'scanning'
  const isSuccess = phase === 'success'
  const isError = phase === 'error'
  const isVerifyError = isError && errorSource === 'verify'
  const showCameraHelp = isError && errorSource === 'camera' && Boolean(cameraIssue)
  const canRetryCamera =
    showCameraHelp &&
    cameraIssue?.type !== 'unsupported-browser' &&
    cameraIssue?.type !== 'scanner-unsupported'
  const overlayTitle = isSuccess
    ? 'Order Verified'
    : isVerifyError
      ? 'Verification failed'
      : showCameraHelp
        ? cameraIssue?.title || 'Camera unavailable'
        : phase === 'prompting-permission'
          ? 'Allow camera access'
          : isPreparingCamera
            ? 'Starting camera...'
            : 'Camera ready'
  const overlayMessage =
    !isSuccess && !showCameraHelp && isPreparingCamera && !message
      ? 'Preparing camera...'
      : message

  return (
    <Modal
      open={open}
      onClose={() => {
        if (isVerifying) return
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
                  ) : isStartingCamera ? (
                    <SpinnerStatusIcon />
                  ) : (
                    <CameraStatusIcon />
                  )}

                  {isSuccess ? (
                    <>
                      <p className="text-xl font-bold">{overlayTitle}</p>
                      <p className="text-sm text-emerald-200">{orderLabel}</p>
                      <p className="text-sm text-slate-200">{overlayMessage}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold">{overlayTitle}</p>
                      <p
                        className={`text-sm ${
                          isVerifyError ? 'text-red-100' : 'text-slate-200'
                        }`}
                      >
                        {overlayMessage}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {phase === 'prompting-permission' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-medium">To scan QR codes, please allow camera access.</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              If you do not see a browser prompt, check the lock or site icon near the address bar.
            </p>
          </div>
        )}

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

        {isVerifyError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {message}
          </div>
        )}

        {showCameraHelp && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200">
            <p className="font-semibold text-slate-900 dark:text-white">
              Camera help
            </p>
            <p className="mt-1">{cameraIssue.message}</p>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-gray-400">
              Permission status: {formatPermissionState(permissionState)}
            </p>

            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-gray-300">
              {CAMERA_HELP_ITEMS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 text-slate-400 dark:text-gray-500">
                    -
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {canRetryCamera && (
            <Button
              variant="secondary"
              onClick={handleRetryCamera}
              disabled={isVerifying}
            >
              Try Again
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isVerifying}
          >
            {isSuccess ? 'Closing...' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
