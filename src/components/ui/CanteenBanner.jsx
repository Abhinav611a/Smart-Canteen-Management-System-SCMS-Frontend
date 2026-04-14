import {
  AlertTriangle,
  Clock3,
  Sparkles,
  Store,
  TimerReset,
} from 'lucide-react'
import { useCanteen } from '@/context/CanteenContext'
import { useAuth } from '@/context/AuthContext'

function TimeBox({ value, label, urgent = false }) {
  return (
    <div
      className={`min-w-[72px] rounded-2xl border px-3 py-2 text-center shadow-sm backdrop-blur-md ${
        urgent
          ? 'border-amber-200/70 bg-white/80 dark:border-amber-400/20 dark:bg-white/5'
          : 'border-white/60 bg-white/70 dark:border-white/10 dark:bg-white/5'
      }`}
    >
      <div className="text-lg font-black leading-none text-slate-900 dark:text-white sm:text-xl">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  )
}

function ClosingSoonBanner({ countdown, remainingMs }) {
  const totalSeconds = Math.max(0, Math.ceil((remainingMs || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const urgent = totalSeconds <= 120

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-amber-200/70 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 px-4 py-4 shadow-[0_12px_40px_rgba(245,158,11,0.18)] dark:border-amber-400/20 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-amber-400/10 dark:shadow-[0_12px_40px_rgba(245,158,11,0.12)] sm:px-5 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl dark:bg-amber-400/10" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-orange-300/20 blur-2xl dark:bg-orange-400/10" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-300">
            <Clock3 size={14} />
            Closing Soon
          </div>

          <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
            Hurry up — the canteen is closing soon
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Place your order before the timer runs out.
          </p>

          <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            Closing in {countdown}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-center">
          <TimeBox value={String(minutes).padStart(2, '0')} label="Min" urgent={urgent} />
          <TimeBox value={String(seconds).padStart(2, '0')} label="Sec" urgent={urgent} />
        </div>
      </div>
    </div>
  )
}

function OpeningBanner() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-sky-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-indigo-50 px-4 py-4 shadow-[0_12px_40px_rgba(59,130,246,0.14)] dark:border-sky-400/20 dark:from-sky-500/10 dark:via-cyan-500/10 dark:to-indigo-500/10 sm:px-5 sm:py-5">
      <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-sky-300/25 blur-2xl dark:bg-sky-400/10" />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-sky-600 shadow-sm dark:bg-white/5 dark:text-sky-300">
          <Sparkles size={20} />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700 dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-300">
            <Store size={14} />
            Opening Soon
          </div>

          <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
            We’re getting things ready for you
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            The canteen is opening shortly. You can browse the menu while the team prepares service.
          </p>
        </div>
      </div>
    </div>
  )
}

function ClosingBanner() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-rose-200/80 bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 px-4 py-4 shadow-[0_12px_40px_rgba(239,68,68,0.14)] dark:border-rose-400/20 dark:from-rose-500/10 dark:via-red-500/10 dark:to-orange-500/10 sm:px-5 sm:py-5">
      <div className="relative flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-rose-600 shadow-sm dark:bg-white/5 dark:text-rose-300">
          <TimerReset size={20} />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-700 dark:border-rose-400/20 dark:bg-white/5 dark:text-rose-300">
            <AlertTriangle size={14} />
            Closing
          </div>

          <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
            Not accepting new orders
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Completing existing orders. Order tracking will continue as usual.
          </p>
        </div>
      </div>
    </div>
  )
}

function ClosedBanner() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-100 px-4 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-5 sm:py-5">
      <div className="relative flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-300">
          <Store size={20} />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <Store size={14} />
            Closed
          </div>

          <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
            The canteen is currently closed
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Browse the menu and come back when service resumes.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CanteenBanner() {
  const {
    isOpen,
    isOpening,
    isClosing,
    isClosed,
    hasClosingWarning,
    countdown,
    remainingMs,
  } = useCanteen()
  const { user } = useAuth()
  const userRole = String(user?.role || '').toUpperCase()
  const isStudent = userRole === 'USER'

  if (isOpen && hasClosingWarning && isStudent) {
    return <ClosingSoonBanner countdown={countdown} remainingMs={remainingMs} />
  }

  if (isOpening) {
    return <OpeningBanner />
  }

  if (isClosing) {
    return <ClosingBanner />
  }

  if (isClosed) {
    return <ClosedBanner />
  }

  return null
}
