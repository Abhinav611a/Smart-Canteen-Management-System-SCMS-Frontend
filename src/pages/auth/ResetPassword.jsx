import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'

const OTP_TYPE_RESET_PASSWORD = 'RESET_PASSWORD'
const RESEND_COOLDOWN = 30

function maskEmail(email = '') {
  const [name, domain] = String(email).split('@')
  if (!name || !domain) return email

  if (name.length <= 2) {
    return `${name[0] || ''}***@${domain}`
  }

  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { resetPassword, resendOtp } = useAuth()

  const email = useMemo(
    () => location.state?.email?.trim?.() || '',
    [location.state]
  )

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [errors, setErrors] = useState({})
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true })
    }
  }, [email, navigate])

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

  const validateResetStep = () => {
    const nextErrors = {}

    if (!otp.trim()) nextErrors.otp = 'OTP is required'
    if (!newPassword || newPassword.length < 6) {
      nextErrors.newPassword = 'Password must be at least 6 characters'
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password'
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (!validateResetStep()) return

    setLoading(true)

    try {
      await resetPassword({
        email,
        otp: otp.trim(),
        newPassword,
      })

      toast.success('Password reset successful')
      navigate('/login', {
        replace: true,
        state: { email },
      })
    } catch (err) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!email || cooldown > 0) return

    setResending(true)

    try {
      await resendOtp({
        email,
        type: OTP_TYPE_RESET_PASSWORD,
      })
      toast.success('OTP resent successfully')
      setCooldown(RESEND_COOLDOWN)
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  if (!email) return null

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-glow">
            🔐
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Enter the OTP sent to {maskEmail(email)}
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Email Address
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white break-all">
                {email}
              </p>
            </div>

            <Input
              id="reset-otp"
              name="otp"
              label="OTP"
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              error={errors.otp}
              icon="🔢"
              autoComplete="one-time-code"
            />

            <Input
              id="new-password"
              name="newPassword"
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
              icon="🔒"
              autoComplete="new-password"
              showPasswordToggle
            />

            <Input
              id="confirm-new-password"
              name="confirmNewPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              icon="🔒"
              autoComplete="new-password"
              showPasswordToggle
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
              size="lg"
            >
              {loading ? 'Resetting Password…' : 'Reset Password'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleResendOtp}
              disabled={resending || cooldown > 0}
            >
              {resending
                ? 'Resending OTP…'
                : cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : 'Resend OTP'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Back to{' '}
            <Link
              to="/login"
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
