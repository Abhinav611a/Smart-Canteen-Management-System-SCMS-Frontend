import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { extractQrCodeValue } from '@/services/orders'

const AUTO_CLOSE_DELAY_MS = 1500
const CAMERA_HANDOFF_DELAY_MS = 150
const SCAN_DEBOUNCE_MS = 1500
const HTML5_QRCODE_SCRIPT_ID = 'html5-qrcode-script'
const HTML5_QRCODE_SCRIPT_URL = 'https://unpkg.com/html5-qrcode'
const CAMERA_STARTUP_PHASES = [
  'checking-support',
  'loading-decoder',
  'checking-permission',
  'prompting-permission',
  'requesting-camera',
  'starting-live-scan',
]
const CAMERA_HELP_ITEMS = [
  'Allow camera access from your browser site settings for this page.',
  'Check the lock or site icon near the address bar and enable Camera access.',
  'Close other apps or tabs using the camera, such as Zoom, Meet, or Teams.',
  'Try Chrome, Edge, Safari, or a mobile device if this desktop browser is restricted.',
  'Use manual code entry or an external scanner if your setup provides one.',
]

let html5QrcodeLoadPromise = null

const delay = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

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

  return message
}

function isValidOrderQrCode(code = '') {
  return String(code || '').includes('|')
}

function createCameraIssue(type, overrides = {}) {
  const issues = {
    'unsupported-browser': {
      title: 'Camera not supported',
      message:
        'This browser does not support the camera APIs required for in-app QR scanning.',
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
    'decoder-load-failed': {
      title: 'Live QR scanner unavailable',
      message:
        'The cross-browser QR scanning library could not be loaded. You can still enter the code manually or use an external scanner.',
    },
    'decoder-init-failed': {
      title: 'Unable to start live QR scanning',
      message:
        'The cross-browser QR scanner could not initialize the camera feed. Please try again or enter the code manually.',
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

async function getNativeBarcodeFormats() {
  if (
    typeof window === 'undefined' ||
    typeof window.BarcodeDetector === 'undefined' ||
    typeof window.BarcodeDetector.getSupportedFormats !== 'function'
  ) {
    return null
  }

  try {
    const formats = await window.BarcodeDetector.getSupportedFormats()
    return Array.isArray(formats) ? formats : null
  } catch {
    return null
  }
}

async function getVideoInputCount() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.enumerateDevices !== 'function'
  ) {
    return null
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === 'videoinput').length
  } catch {
    return null
  }
}

async function collectScannerDiagnostics() {
  const support = checkCameraSupport()
  const [permissionState, nativeBarcodeFormats, videoInputCount] =
    await Promise.all([
      getCameraPermissionState(),
      getNativeBarcodeFormats(),
      getVideoInputCount(),
    ])

  return {
    hasMediaDevices: support.hasMediaDevices,
    hasGetUserMedia: support.hasGetUserMedia,
    hasBarcodeDetector: support.hasBarcodeDetector,
    isSecureContext: support.isSecureContext,
    videoInputCount,
    permissionState,
    nativeBarcodeFormats,
    nativeQrSupported: Array.isArray(nativeBarcodeFormats)
      ? nativeBarcodeFormats.includes('qr_code')
      : null,
  }
}

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
      reject(createCameraIssue('decoder-load-failed'))
      return
    }

    const handleReady = () => {
      const api = getHtml5QrcodeGlobals()
      if (api) {
        resolve(api)
        return
      }
      reject(createCameraIssue('decoder-load-failed'))
    }

    const handleError = () => {
      reject(createCameraIssue('decoder-load-failed'))
    }

    const existingScript = document.getElementById(HTML5_QRCODE_SCRIPT_ID)
    if (existingScript) {
      const api = getHtml5QrcodeGlobals()
      if (api) {
        resolve(api)
        return
      }

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

function isConstraintError(error) {
  const name = String(error?.name || '')
  const text = `${name} ${String(error?.message || error || '')}`.toLowerCase()

  return (
    name === 'OverconstrainedError' ||
    name === 'ConstraintNotSatisfiedError' ||
    text.includes('overconstrainederror') ||
    text.includes('constraintnotsatisfiederror')
  )
}

function classifyCameraError(error, { permissionState = 'unknown' } = {}) {
  const name = String(error?.name || '')
  const text = `${name} ${String(error?.message || error || '')}`.toLowerCase()

  if (
    name === 'NotAllowedError' ||
    text.includes('notallowederror') ||
    text.includes('permission denied') ||
    text.includes('permission blocked')
  ) {
    return createCameraIssue('permission-denied', {
      permissionState,
      originalError: error,
    })
  }

  if (
    name === 'SecurityError' ||
    text.includes('securityerror') ||
    text.includes('secure origin')
  ) {
    return createCameraIssue('security-blocked', {
      permissionState,
      originalError: error,
    })
  }

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    text.includes('notfounderror') ||
    text.includes('requested device not found')
  ) {
    return createCameraIssue('no-camera', {
      permissionState,
      originalError: error,
    })
  }

  if (
    name === 'NotReadableError' ||
    name === 'TrackStartError' ||
    name === 'AbortError' ||
    text.includes('notreadableerror') ||
    text.includes('trackstarterror') ||
    text.includes('could not start video source') ||
    text.includes('device in use')
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

function classifyLiveScannerError(error, context = {}) {
  const issue = classifyCameraError(error, context)

  if (issue.type === 'init-failed') {
    return createCameraIssue('decoder-init-failed', {
      ...context,
      originalError: error,
    })
  }

  return issue
}

async function requestCameraAccess({ permissionState = 'unknown' } = {}) {
  const preferredConstraints = {
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
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

  if (id != null && String(id).trim()) return `Order #${id}`

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
      // Ignore cleanup errors while closing camera streams.
    }
  })
}

function formatDiagnosticValue(value) {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None reported'
  if (value == null) return 'Unknown'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function StatusIcon({ kind }) {
  if (kind === 'spinner') {
    return (
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
      </span>
    )
  }

  if (kind === 'success') {
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

  if (kind === 'error') {
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
  const scannerContainerRef = useRef(null)
  const scannerContainerIdRef = useRef(
    `manager-qr-scanner-${Math.random().toString(36).slice(2, 10)}`
  )
  const html5QrcodeRef = useRef(null)
  const html5QrcodeRunningRef = useRef(false)
  const streamRef = useRef(null)
  const closeTimerRef = useRef(0)
  const processingRef = useRef(false)
  const lastScanValueRef = useRef('')
  const lastScanAtRef = useRef(0)
  const lockedQrValueRef = useRef('')

  const [phase, setPhase] = useState('idle')
  const [message, setMessage] = useState('')
  const [orderLabel, setOrderLabel] = useState('')
  const [errorSource, setErrorSource] = useState('')
  const [permissionState, setPermissionState] = useState('unknown')
  const [cameraIssue, setCameraIssue] = useState(null)
  const [startAttempt, setStartAttempt] = useState(0)
  const [manualCode, setManualCode] = useState('')
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [scannerDiagnostics, setScannerDiagnostics] = useState(null)
  const [decoderName, setDecoderName] = useState('native-barcode-detector')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lockedQrValue, setLockedQrValue] = useState('')

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = 0
    }
  }, [])

  const clearScannerContainer = useCallback(() => {
    const container = scannerContainerRef.current
    if (container) container.innerHTML = ''
  }, [])

  const resetCameraState = useCallback(() => {
    setMessage('')
    setOrderLabel('')
    setErrorSource('')
    setPermissionState('unknown')
    setCameraIssue(null)
    setScannerDiagnostics(null)
    setDecoderName('native-barcode-detector')
  }, [])

  const resetScanTracking = useCallback(() => {
    processingRef.current = false
    lastScanValueRef.current = ''
    lastScanAtRef.current = 0
    lockedQrValueRef.current = ''
    setLockedQrValue('')
    setIsProcessing(false)
  }, [])

  const stopScanner = useCallback(async () => {
    const activeScanner = html5QrcodeRef.current
    const wasRunning = html5QrcodeRunningRef.current

    html5QrcodeRef.current = null
    html5QrcodeRunningRef.current = false
    stopStream(streamRef.current)
    streamRef.current = null

    if (activeScanner) {
      try {
        if (wasRunning && typeof activeScanner.stop === 'function') {
          await activeScanner.stop()
        }
      } catch (error) {
        console.warn('[QR] Failed to stop live scanner:', error)
      }

      try {
        if (typeof activeScanner.clear === 'function') {
          await activeScanner.clear()
        }
      } catch (error) {
        console.warn('[QR] Failed to clear live scanner:', error)
      }
    }

    clearScannerContainer()
  }, [clearScannerContainer])

  const scheduleAutoClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      onClose()
    }, AUTO_CLOSE_DELAY_MS)
  }, [clearCloseTimer, onClose])

  const setCameraFailure = useCallback((issue, { openManual = true } = {}) => {
    setErrorSource('camera')
    setCameraIssue(issue)
    setMessage(issue.message)
    setOrderLabel('')
    setPhase('error')
    if (openManual) setManualEntryOpen(true)
  }, [])

  const handleRetryCamera = useCallback(async () => {
    clearCloseTimer()
    resetScanTracking()
    await stopScanner()
    resetCameraState()
    setManualCode('')
    setManualEntryOpen(false)
    setPhase('idle')
    setStartAttempt((value) => value + 1)
  }, [clearCloseTimer, resetCameraState, resetScanTracking, stopScanner])

  const handleDetectedCode = useCallback(
    async (code) => {
      const submittedCode = extractQrCodeValue(code)
      if (!submittedCode || processingRef.current) return

      if (
        lockedQrValueRef.current &&
        lockedQrValueRef.current !== submittedCode
      ) {
        return
      }

      const now = Date.now()
      const isDuplicateScan =
        lastScanValueRef.current === submittedCode &&
        now - lastScanAtRef.current < SCAN_DEBOUNCE_MS

      if (isDuplicateScan) return

      lastScanValueRef.current = submittedCode
      lastScanAtRef.current = now
      lockedQrValueRef.current = submittedCode
      setLockedQrValue(submittedCode)

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35)
      }

      processingRef.current = true
      setIsProcessing(true)

      setPhase('verifying')
      setMessage('QR detected. Verifying order...')
      setOrderLabel('')
      setErrorSource('')
      setCameraIssue(null)

      if (!isValidOrderQrCode(submittedCode)) {
        const invalidMessage =
          'Invalid QR code format. Please scan the latest order QR.'

        await stopScanner()
        toast.error(invalidMessage, { id: 'qr-format-error' })
        setOrderLabel('')
        setErrorSource('verify')
        setCameraIssue(null)
        setMessage(invalidMessage)
        setPhase('error')
        scheduleAutoClose()
        resetScanTracking()
        return
      }

      try {
        const result = await onVerify(submittedCode)
        await stopScanner()

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 60])
        }

        setOrderLabel(getOrderLabel(result))
        setMessage('Successfully collected')
        setPhase('success')
        scheduleAutoClose()
      } catch (error) {
        await stopScanner()
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
        resetScanTracking()
      }
    },
    [onVerify, resetScanTracking, scheduleAutoClose, stopScanner]
  )

  const handleManualSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      await handleDetectedCode(manualCode)
    },
    [handleDetectedCode, manualCode]
  )

  useEffect(() => {
    if (!open) {
      clearCloseTimer()
      resetScanTracking()
      setPhase('idle')
      setManualCode('')
      setManualEntryOpen(false)
      resetCameraState()
      void stopScanner()
      return undefined
    }

    let cancelled = false

    const startScanner = async () => {
      resetCameraState()
      resetScanTracking()
      setManualCode('')
      setManualEntryOpen(false)
      setPhase('checking-support')
      setMessage('Checking camera support...')

      const diagnostics = await collectScannerDiagnostics()
      if (cancelled) return

      setScannerDiagnostics(diagnostics)
      setPermissionState(diagnostics.permissionState)
      console.info('[QR] Scanner diagnostics', diagnostics)

      if (!diagnostics.hasMediaDevices || !diagnostics.hasGetUserMedia) {
        setCameraFailure(
          diagnostics.isSecureContext
            ? createCameraIssue('unsupported-browser')
            : createCameraIssue('security-blocked')
        )
        return
      }

      if (diagnostics.videoInputCount === 0) {
        setCameraFailure(createCameraIssue('no-camera'))
        return
      }

      setPhase('loading-decoder')
      setMessage('Loading live QR scanner...')

      let html5QrcodeApi = null
      try {
        html5QrcodeApi = await loadHtml5QrcodeLibrary()
      } catch (error) {
        if (cancelled) return
        setDecoderName('manual-only')
        setCameraFailure(error?.type ? error : createCameraIssue('decoder-load-failed'))
        return
      }

      if (cancelled) return

      setDecoderName('html5-qrcode')
      setPhase('checking-permission')
      setMessage('Checking camera permission...')

      const resolvedPermissionState =
        diagnostics.permissionState === 'unknown'
          ? await getCameraPermissionState()
          : diagnostics.permissionState

      if (cancelled) return

      setPermissionState(resolvedPermissionState)
      setScannerDiagnostics((current) =>
        current ? { ...current, permissionState: resolvedPermissionState } : current
      )

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
        setMessage('Requesting camera access...')
      }

      let permissionStream = null
      try {
        permissionStream = await requestCameraAccess({
          permissionState: resolvedPermissionState,
        })
      } catch (error) {
        if (cancelled) return
        setCameraFailure(
          error?.type
            ? error
            : classifyCameraError(error, {
                permissionState: resolvedPermissionState,
              })
        )
        return
      }

      if (cancelled) {
        stopStream(permissionStream)
        return
      }

      streamRef.current = permissionStream
      if (resolvedPermissionState !== 'granted') {
        setPermissionState('granted')
      }

      setPhase('starting-live-scan')
      setMessage('Starting live QR scanner...')
      stopStream(permissionStream)
      streamRef.current = null
      await delay(CAMERA_HANDOFF_DELAY_MS)
      if (cancelled) return

      const container = scannerContainerRef.current
      if (!container) {
        setCameraFailure(createCameraIssue('decoder-init-failed'))
        return
      }

      clearScannerContainer()

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = html5QrcodeApi
      const liveScanner = new Html5Qrcode(scannerContainerIdRef.current, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false,
        },
        verbose: false,
      })

      html5QrcodeRef.current = liveScanner

      try {
        await liveScanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            aspectRatio: 4 / 3,
            disableFlip: false,
          },
          (decodedText) => {
            void handleDetectedCode(decodedText)
          },
          () => {
            // Ignore frame-level decode misses and keep scanning.
          }
        )

        if (cancelled) {
          await stopScanner()
          return
        }

        html5QrcodeRunningRef.current = true
        setPhase('scanning')
        setMessage('Point the camera at the QR code anywhere in view to verify pickup.')
      } catch (error) {
        if (cancelled) return
        setCameraFailure(
          classifyLiveScannerError(error, {
            permissionState: resolvedPermissionState,
          })
        )
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      clearCloseTimer()
      processingRef.current = false
      lastScanValueRef.current = ''
      lastScanAtRef.current = 0
      lockedQrValueRef.current = ''
      void stopScanner()
    }
  }, [
    clearCloseTimer,
    open,
    resetCameraState,
    resetScanTracking,
    setCameraFailure,
    startAttempt,
    stopScanner,
    handleDetectedCode,
  ])

  const isStartingCamera = CAMERA_STARTUP_PHASES.includes(phase)
  const isPreparingCamera = phase === 'idle' || isStartingCamera
  const isVerifying = phase === 'verifying' || isProcessing
  const isScanning = phase === 'scanning'
  const isTrackingLocked = Boolean(lockedQrValue)
  const isLivePreviewVisible = isScanning || isVerifying || isTrackingLocked
  const isSuccess = phase === 'success'
  const isError = phase === 'error'
  const isVerifyError = isError && errorSource === 'verify'
  const showCameraHelp = isError && errorSource === 'camera' && Boolean(cameraIssue)
  const showManualEntry = manualEntryOpen || showCameraHelp
  const canRetryCamera = showCameraHelp && cameraIssue?.type !== 'unsupported-browser'
  const overlayTitle = isSuccess
    ? 'Order Verified'
    : isVerifyError
      ? 'Verification failed'
      : showCameraHelp
        ? cameraIssue?.title || 'Camera unavailable'
        : phase === 'prompting-permission'
          ? 'Allow camera access'
          : phase === 'loading-decoder'
            ? 'Loading live scanner...'
            : phase === 'starting-live-scan'
              ? 'Starting live scanner...'
              : isPreparingCamera
                ? 'Preparing camera...'
                : 'Camera ready'
  const overlayMessage =
    !isSuccess && !showCameraHelp && isPreparingCamera && !message
      ? 'Preparing camera...'
      : message

  const diagnosticRows = scannerDiagnostics
    ? [
        {
          label: 'Camera API',
          value:
            scannerDiagnostics.hasMediaDevices &&
            scannerDiagnostics.hasGetUserMedia
              ? 'Available'
              : 'Unavailable',
        },
        {
          label: 'Video inputs',
          value:
            scannerDiagnostics.videoInputCount == null
              ? 'Unknown'
              : scannerDiagnostics.videoInputCount,
        },
        {
          label: 'BarcodeDetector',
          value: scannerDiagnostics.hasBarcodeDetector
            ? 'Available'
            : 'Unavailable',
        },
        {
          label: 'Native QR format',
          value:
            scannerDiagnostics.nativeQrSupported == null
              ? scannerDiagnostics.hasBarcodeDetector
                ? 'Unknown'
                : 'Unavailable'
              : scannerDiagnostics.nativeQrSupported
                ? 'Supported'
                : 'Not supported',
        },
        { label: 'Native formats', value: scannerDiagnostics.nativeBarcodeFormats },
        { label: 'Permission state', value: formatPermissionState(permissionState) },
        {
          label: 'Live decoder',
          value:
            decoderName === 'html5-qrcode'
              ? 'html5-qrcode'
              : decoderName === 'manual-only'
                ? 'Manual entry only'
                : 'Pending',
        },
      ]
    : []

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
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <div
              id={scannerContainerIdRef.current}
              ref={scannerContainerRef}
              className={`h-full w-full bg-slate-950 transition-all duration-300 ease-out ${
                isLivePreviewVisible ? 'opacity-100' : 'opacity-25'
              } ${isTrackingLocked ? 'scale-[1.04]' : 'scale-100'} [&>*]:h-full [&>*]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover`}
            />

            <div
              className={`pointer-events-none absolute inset-4 rounded-[2rem] border transition-all duration-300 sm:inset-6 ${
                isTrackingLocked
                  ? 'border-emerald-300/70 shadow-[0_0_40px_rgba(16,185,129,0.3)]'
                  : 'border-white/15'
              }`}
            >
              <div
                className={`absolute left-0 top-0 h-12 w-12 rounded-tl-[2rem] border-l-4 border-t-4 transition-colors duration-300 ${
                  isTrackingLocked
                    ? 'border-emerald-300 animate-pulse'
                    : 'border-white/85'
                }`}
              />
              <div
                className={`absolute right-0 top-0 h-12 w-12 rounded-tr-[2rem] border-r-4 border-t-4 transition-colors duration-300 ${
                  isTrackingLocked
                    ? 'border-emerald-300 animate-pulse'
                    : 'border-white/85'
                }`}
              />
              <div
                className={`absolute bottom-0 left-0 h-12 w-12 rounded-bl-[2rem] border-b-4 border-l-4 transition-colors duration-300 ${
                  isTrackingLocked
                    ? 'border-emerald-300 animate-pulse'
                    : 'border-white/85'
                }`}
              />
              <div
                className={`absolute bottom-0 right-0 h-12 w-12 rounded-br-[2rem] border-b-4 border-r-4 transition-colors duration-300 ${
                  isTrackingLocked
                    ? 'border-emerald-300 animate-pulse'
                    : 'border-white/85'
                }`}
              />
            </div>

            {isTrackingLocked && (
              <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-lg">
                QR detected
              </div>
            )}

            {!isLivePreviewVisible && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 px-6 text-center text-white">
                <div className="space-y-3">
                  <StatusIcon
                    kind={
                      isSuccess ? 'success' : isError ? 'error' : isStartingCamera ? 'spinner' : 'camera'
                    }
                  />

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
            {message || 'Verifying scanned order...'}
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
              Camera and scanner help
            </p>
            <p className="mt-1">{cameraIssue.message}</p>

            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-gray-800 dark:text-gray-300">
              Native browser QR decoding was limited here, so this modal now tries `html5-qrcode` instead of relying on `BarcodeDetector`.
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

            {diagnosticRows.length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-gray-400">
                  Scanner diagnostics
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {diagnosticRows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <p className="font-semibold text-slate-500 dark:text-gray-400">
                        {row.label}
                      </p>
                      <p className="mt-1 break-words text-slate-800 dark:text-gray-100">
                        {formatDiagnosticValue(row.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showManualEntry ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Manual code entry
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                  Paste the full QR value and we will verify it with the backend.
                </p>
              </div>

              {!showCameraHelp && (
                <button
                  type="button"
                  onClick={() => setManualEntryOpen(false)}
                  className="text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Hide
                </button>
              )}
            </div>

            <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
              <Input
                name="manualQrCode"
                label="QR Code"
                placeholder="Paste the full scanned code here"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                disabled={isVerifying}
                autoComplete="off"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={isVerifying}
                  disabled={!manualCode.trim() || isVerifying}
                >
                  Verify Code
                </Button>
              </div>
            </form>
          </div>
        ) : (
          !isSuccess && (
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManualEntryOpen(true)}
                disabled={isVerifying}
              >
                Enter Code Manually
              </Button>
            </div>
          )
        )}

        <div className="flex justify-end gap-3">
          {canRetryCamera && (
            <Button
              variant="secondary"
              onClick={() => {
                void handleRetryCamera()
              }}
              disabled={isVerifying}
            >
              Try Live Scan Again
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
