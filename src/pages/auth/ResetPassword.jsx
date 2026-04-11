import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { authService } from '@/services/auth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    email: location.state?.email || '',
    otp: '',
    newPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const validate = () => {
    const nextErrors = {}

    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!form.otp.trim()) nextErrors.otp = 'OTP is required'
    if (!form.newPassword.trim()) nextErrors.newPassword = 'New password is required'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const message = await authService.resetPassword({
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.newPassword,
      })

      toast.success(typeof message === 'string' ? message : 'Password reset successful')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!form.email.trim()) {
      setErrors((prev) => ({ ...prev, email: 'Email is required' }))
      return
    }

    setResending(true)
    try {
      const message = await authService.resendOtp(form.email.trim())
      toast.success(typeof message === 'string' ? message : 'OTP resent successfully')
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

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
            🔑
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Enter OTP and your new password
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="reset-email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              error={errors.email}
              icon="✉️"
              autoComplete="email"
            />

            <Input
              id="reset-otp"
              name="otp"
              label="OTP"
              type="text"
              placeholder="Enter OTP"
              value={form.otp}
              onChange={(e) => setForm((prev) => ({ ...prev, otp: e.target.value }))}
              error={errors.otp}
              icon="🔢"
            />

            <Input
              id="reset-new-password"
              name="newPassword"
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={form.newPassword}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              error={errors.newPassword}
              icon="🔒"
              autoComplete="new-password"
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={handleResendOtp}
                loading={resending}
                disabled={resending}
              >
                {resending ? 'Resending…' : 'Resend OTP'}
              </Button>

              <Button
                type="submit"
                className="flex-1"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </Button>
            </div>
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