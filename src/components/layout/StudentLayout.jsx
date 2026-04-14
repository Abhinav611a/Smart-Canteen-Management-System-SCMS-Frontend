import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell,
  Home,
  Receipt,
  ShoppingCart,
  User,
  Moon,
  Sun,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useCanteenStatus } from '@/hooks/useCanteenStatus'
import CanteenBanner from '@/components/ui/CanteenBanner'

function getPageTitle(pathname) {
  if (pathname.includes('/student/orders')) return 'My Orders'
  if (pathname.includes('/student/cart')) return 'My Cart'
  if (pathname.includes('/student/profile')) return 'Profile'
  if (pathname.includes('/student/invoices')) return 'Invoices'
  return 'Canteen Pro'
}

function BottomNavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-all duration-200',
          isActive
            ? 'text-emerald-600'
            : 'text-slate-400 hover:text-slate-600',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={[
              'relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
              isActive ? 'bg-emerald-50 shadow-sm' : 'bg-transparent',
            ].join(' ')}
          >
            <Icon size={19} strokeWidth={2.2} />
            {badge > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-white shadow">
                {badge > 99 ? '99+' : badge}
              </span>
            ) : null}
          </div>
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function ThemeToggleButton() {
  const { isDark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-gray-800"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          initial={{ opacity: 0, rotate: -90, scale: 0.7, y: 4 }}
          animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.7, y: -4 }}
          transition={{ duration: 0.18 }}
          className="absolute"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { count } = useCart()
  const { user } = useAuth()
  const location = useLocation()
  const canteenStatus = useCanteenStatus()

  const pageTitle = getPageTitle(location.pathname)
  const userName =
    user?.name?.split(' ')[0]?.trim() ||
    user?.email?.split('@')[0] ||
    'User'

  const navItems = [
    { type: 'divider', label: 'Student' },
    { to: '/student/menu', icon: '🍽', label: 'Browse Menu' },
    { to: '/student/cart', icon: '🛒', label: 'My Cart', badge: count },
    { to: '/student/orders', icon: '📦', label: 'My Orders' },
    { to: '/student/profile', icon: '👤', label: 'Profile' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-slate-100">
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 lg:hidden">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600">
                Student
              </p>
              <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                {pageTitle}
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Welcome, {userName}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-gray-800"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>

              <ThemeToggleButton />

              <NavLink
                to="/student/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 active:scale-95 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                aria-label="Open profile"
              >
                <User size={18} />
              </NavLink>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4">
          <div className="space-y-4">
            <CanteenBanner />
            <Outlet context={{ canteenStatus }} />
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
          <div className="mx-auto flex w-full max-w-md items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom)]">
            <BottomNavItem to="/student/menu" icon={Home} label="Home" />
            <BottomNavItem
              to="/student/orders"
              icon={Receipt}
              label="Orders"
            />
            <BottomNavItem
              to="/student/cart"
              icon={ShoppingCart}
              label="Cart"
              badge={count}
            />
            <BottomNavItem
              to="/student/profile"
              icon={User}
              label="Profile"
            />
          </div>
        </nav>
      </div>

      <div className="hidden h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 lg:flex">
        <Sidebar
          navItems={navItems}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-6">
              <CanteenBanner />
              <Outlet context={{ canteenStatus }} />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}