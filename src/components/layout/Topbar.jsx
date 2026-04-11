import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { getInitials } from '@/utils/helpers'
import ThemeToggle from '@/components/ui/ThemeToggle'
import NotificationBell from '@/components/ui/NotificationBell'
import CanteenToggle from '@/pages/admin/CanteenToggle'

export default function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth()
  const [dropOpen, setDropOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setDropOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="btn-ghost p-2 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {title && (
          <h1 className="hidden text-lg font-semibold text-gray-900 dark:text-white sm:block">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {user?.role === 'ADMIN' && <CanteenToggle />}
        <NotificationBell />
        <ThemeToggle />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setDropOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-xs font-bold text-white">
              {getInitials(user?.name)}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-none text-gray-800 dark:text-gray-200">
                {user?.name}
              </p>
              <p className="text-[10px] text-gray-400">{user?.role}</p>
            </div>
          </button>

          {dropOpen && (
            <div className="glass-card-solid absolute right-0 top-full z-50 mt-2 w-48 animate-fade-in p-1 shadow-lg">
              <div className="mb-1 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>

              <button
                onClick={logout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}