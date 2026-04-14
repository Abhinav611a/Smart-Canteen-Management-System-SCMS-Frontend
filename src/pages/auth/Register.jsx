import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { BACKEND_URL } from '@/utils/constants'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2.1 1.6-4.5 2.4-7.3 2.4-5.2 0-9.6-3.3-11.1-8l-6.5 5C9.7 39.6 16.3 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.4-6 6.8l.1-.1 6.2 5.2C35.2 40.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"
    />
  </svg>
)

const OTP_TYPE_VERIFY_EMAIL = 'VERIFY_EMAIL'
const RESEND_COOLDOWN = 30
const OTP_LENGTH = 6
const PENDING_VERIFY_EMAIL_KEY = 'pending_verify_email'

function CountdownRing({ value, max }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? value / max : 0
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-brand-500 transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-gray-700 dark:text-gray-200">
        {value}s
      </div>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const { register, verifyEmail, resendOtp } = useAuth()

  const [step, setStep] = useState(1)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [errors, setErrors] = useState({})
  const [cooldown, setCooldown] = useState(0)

  const otpRefs = useRef([])

  const GOOGLE_LOGIN_URL = `${BACKEND_URL}/oauth2/authorization/google`

  const otpDigits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => otp[index] || ''),
    [otp]
  )

  const isOtpComplete = otp.length === OTP_LENGTH

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem(PENDING_VERIFY_EMAIL_KEY)

    if (pendingEmail) {
      setForm((prev) => ({
        ...prev,
        email: pendingEmail,
      }))
      setRegisteredEmail(pendingEmail)
      setStep(2)
      setCooldown(RESEND_COOLDOWN)
    }
  }, [])

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        otpRefs.current[0]?.focus()
      }, 120)

      return () => clearTimeout(timer)
    }
  }, [step])

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldown])

  const goToOtpStep = (email) => {
    const cleanEmail = email.trim()

    setForm((prev) => ({
      ...prev,
      email: cleanEmail,
    }))
    setRegisteredEmail(cleanEmail)
    setStep(2)
    setOtp('')
    setErrors({})
    sessionStorage.setItem(PENDING_VERIFY_EMAIL_KEY, cleanEmail)
  }

  const validateRegister = () => {
    const e = {}

    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    if (!form.password || form.password.length < 6) {
      e.password = 'Password must be at least 6 characters'
    }
    if (form.password && form.password.length >= 6) {
      // confirmPassword validation is handled inline only
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateOtp = () => {
    const e = {}

    if (!otp.trim()) e.otp = 'OTP is required'
    else if (otp.trim().length !== OTP_LENGTH) e.otp = `OTP must be ${OTP_LENGTH} digits`

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const focusOtpIndex = (index) => {
    otpRefs.current[index]?.focus()
    otpRefs.current[index]?.select?.()
  }

  const updateOtpAtIndex = (index, digit) => {
    const nextDigits = [...otpDigits]
    nextDigits[index] = digit
    const nextOtp = nextDigits.join('')
    setOtp(nextOtp)
    setErrors((prev) => ({ ...prev, otp: undefined }))
  }

  const handleOtpChange = (index, value) => {
    const digits = String(value || '').replace(/\D/g, '')

    if (!digits) {
      updateOtpAtIndex(index, '')
      return
    }

    if (digits.length > 1) {
      const nextDigits = [...otpDigits]
      let cursor = index

      for (const digit of digits.slice(0, OTP_LENGTH - index)) {
        nextDigits[cursor] = digit
        cursor += 1
        if (cursor >= OTP_LENGTH) break
      }

      setOtp(nextDigits.join(''))
      setErrors((prev) => ({ ...prev, otp: undefined }))

      const nextFocusIndex = Math.min(cursor, OTP_LENGTH - 1)
      focusOtpIndex(nextFocusIndex)
      return
    }

    updateOtpAtIndex(index, digits)
    if (index < OTP_LENGTH - 1) {
      focusOtpIndex(index + 1)
    }
  }

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (otpDigits[index]) {
        updateOtpAtIndex(index, '')
      } else if (index > 0) {
        updateOtpAtIndex(index - 1, '')
        focusOtpIndex(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusOtpIndex(index - 1)
      return
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      focusOtpIndex(index + 1)
    }
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)

    if (!pasted) return

    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || '')
    setOtp(nextDigits.join(''))
    setErrors((prev) => ({ ...prev, otp: undefined }))

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    focusOtpIndex(focusIndex)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!validateRegister()) return

    setLoading(true)

    try {
      // Send only email, name, password (confirmPassword is handled via input field for UX)
      const { name, email, password } = form

      await register({
        email: email.trim(),
        name: name.trim(),
        password,
      })

      const cleanEmail = email.trim()

      goToOtpStep(cleanEmail)
      setCooldown(RESEND_COOLDOWN)
      toast.success('OTP sent to your email')
    } catch (err) {
      if (err?.response?.status === 409) {
        const email = form.email.trim()

        goToOtpStep(email)
        toast('Email already registered. Enter OTP or resend.', {
          icon: '⚠️',
        })
        return
      }

      toast.error(err?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async ({ force = false } = {}) => {
    if (!form.email.trim()) return
    if (!force && cooldown > 0) return

    setResending(true)

    try {
      await resendOtp({
        email: form.email.trim(),
        type: OTP_TYPE_VERIFY_EMAIL,
      })

      setOtp('')
      setErrors((prev) => ({
        ...prev,
        otp: undefined,
      }))
      setCooldown(RESEND_COOLDOWN)
      toast.success('New OTP sent')

      setTimeout(() => {
        focusOtpIndex(0)
      }, 50)
    } catch (err) {
      toast.error(err?.message || 'Failed to resend OTP')
      throw err
    } finally {
      setResending(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e?.preventDefault?.()
    if (!validateOtp()) return

    setLoading(true)

    try {
      await verifyEmail({
        email: form.email.trim(),
        otp: otp.trim(),
      })

      sessionStorage.removeItem(PENDING_VERIFY_EMAIL_KEY)
      setRegisteredEmail('')
      setOtp('')

      toast.success('Email verified successfully')
      navigate('/login', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Email verification failed.'

      if (String(msg).toLowerCase().includes('expired')) {
        setOtp('')
        setErrors((prev) => ({
          ...prev,
          otp: 'OTP expired. Please click resend to get a new OTP.',
        }))
        toast.error('OTP expired. Please click Resend OTP.')
        focusOtpIndex(0)
        return
      }

      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToRegister = () => {
    setStep(1)
    setOtp('')
    setErrors({})
    setRegisteredEmail('')
    sessionStorage.removeItem(PENDING_VERIFY_EMAIL_KEY)
  }

  const handleGoogleRegister = () => {
    window.location.href = GOOGLE_LOGIN_URL
  }

  const showRegisterStep = step === 1 && !registeredEmail

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-glow">
            🍽
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {showRegisterStep ? 'Create Account' : 'Verify Email'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {showRegisterStep
              ? 'Join CanteenDAO'
              : 'Enter the verification code from your inbox'}
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          {showRegisterStep ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  error={errors.name}
                  icon="👤"
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  error={errors.email}
                  icon="✉️"
                />

                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  error={errors.password}
                  icon="🔒"
                  showPasswordToggle
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                  error={errors.confirmPassword}
                  icon="🔒"
                  showPasswordToggle
                />

                <Button
                  type="submit"
                  className="w-full mt-2"
                  loading={loading}
                  size="lg"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </Button>
              </form>

              <div className="relative flex items-center my-5">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                <span className="mx-3 text-xs text-gray-400">OR</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleRegister}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-full py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                    <Mail size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white dark:text-white">
                      Check your email
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      We sent a verification code to
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-brand-600 dark:text-brand-300">
                      {form.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    OTP
                  </label>

                  {cooldown > 0 ? (
                    <div className="flex items-center gap-2">
                      <CountdownRing value={cooldown} max={RESEND_COOLDOWN} />
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                      Ready to resend
                    </span>
                  )}
                </div>

                <div className="flex justify-between gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      disabled={loading}
                      aria-label={`OTP digit ${index + 1}`}
                      className={`
                        h-14 w-12 rounded-2xl border text-center text-xl font-semibold shadow-sm outline-none transition
                        sm:h-16 sm:w-14
                        ${
                          digit
                            ? 'border-brand-500 bg-brand-50 text-gray-900 dark:bg-brand-500/10 dark:text-white'
                            : 'border-gray-300 bg-white/80 text-gray-900 dark:border-gray-700 dark:bg-gray-900/60 dark:text-white'
                        }
                        ${
                          errors.otp
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'
                        }
                        ${loading ? 'cursor-not-allowed opacity-70' : ''}
                      `}
                    />
                  ))}
                </div>

                {errors.otp && (
                  <p className="text-xs text-red-500">{errors.otp}</p>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Paste the code or type one digit at a time.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading || !isOtpComplete}
                size="lg"
              >
                {loading ? 'Verifying…' : 'Verify Email'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => handleResendOtp()}
                disabled={resending || cooldown > 0}
              >
                {resending
                  ? 'Resending OTP…'
                  : cooldown > 0
                    ? `Resend OTP in ${cooldown}s`
                    : 'Resend OTP'}
              </Button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleBackToRegister}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <ArrowLeft size={16} />
                  Change Email
                </button>

                <div className="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <ShieldCheck size={14} />
                  Secure verification
                </div>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}