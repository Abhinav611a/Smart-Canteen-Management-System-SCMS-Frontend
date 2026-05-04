import { useCallback, useEffect, useRef, useState } from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutlet,
} from 'react-router-dom'
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

const DEBUG_STUDENT_SWIPE = false
const SWIPE_THRESHOLD = 56
const HORIZONTAL_DOMINANCE = 1.15
const TRANSITION_LOCK_MS = 200

const studentTabs = [
  { key: 'home', path: '/student/menu' },
  { key: 'orders', path: '/student/orders' },
  { key: 'cart', path: '/student/cart' },
  { key: 'profile', path: '/student/profile' },
]

const pageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 12 : direction < 0 ? -12 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -12 : direction < 0 ? 12 : 0,
    opacity: 0,
  }),
}

const pageTransition = {
  duration: 0.14,
  ease: 'easeOut',
}

function getPageTitle(pathname) {
  if (pathname.includes('/student/orders')) return 'My Orders'
  if (pathname.includes('/student/cart')) return 'My Cart'
  if (pathname.includes('/student/profile')) return 'Profile'
  if (pathname.includes('/student/invoices')) return 'Invoices'
  return 'Canteen Pro'
}

function BottomNavItem({ to, icon: Icon, label, badge, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
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
          <motion.div
            className={[
              'relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
              isActive ? 'bg-emerald-50 shadow-sm' : 'bg-transparent',
            ].join(' ')}
            animate={{ scale: isActive ? 1 : 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Icon size={19} strokeWidth={2.2} />
            {badge > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-white shadow">
                {badge > 99 ? '99+' : badge}
              </span>
            ) : null}
          </motion.div>
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

function getSwipeIgnoreReason(target) {
  if (!target?.closest) return ''
  if (target.closest('input, textarea, select')) return 'form'
  if (target.closest('[data-swipe-ignore="true"]')) return 'data-swipe-ignore'

  const swipeAllowedSurface = target.closest('[data-swipe-allow="true"]')
  const interactive = target.closest('button, a, [role="button"]')

  if (interactive && interactive !== swipeAllowedSurface) return 'interactive'

  return ''
}
export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState(0)
  const [swipeDebug, setSwipeDebug] = useState({
    touchStart: 0,
    touchMove: 0,
    touchEnd: 0,
    deltaX: 0,
    deltaY: 0,
    isHorizontal: false,
    ignored: false,
    ignoreReason: '',
    lock: false,
    targetPath: '',
    commitSource: '',
    direction: '',
    action: 'idle',
  })
  const touchStartRef = useRef(null)
  const didSwipeRef = useRef(false)
  const swipeLockRef = useRef(false)
  const lockTimeoutRef = useRef(null)
  const { count } = useCart()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const canteenStatus = useCanteenStatus()

  const pageTitle = getPageTitle(location.pathname)
  const activeTabIndex = studentTabs.findIndex(
    (tab) =>
      location.pathname === tab.path ||
      location.pathname.startsWith(`${tab.path}/`),
  )
  const activeTab = studentTabs[activeTabIndex]
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

  const updateSwipeDebug = useCallback((nextDebug) => {
    if (!DEBUG_STUDENT_SWIPE) return

    setSwipeDebug((previous) => ({
      ...previous,
      ...(typeof nextDebug === 'function' ? nextDebug(previous) : nextDebug),
      lock: swipeLockRef.current,
    }))
  }, [])

  const clearSwipeLock = useCallback(() => {
    swipeLockRef.current = false
    if (lockTimeoutRef.current) {
      window.clearTimeout(lockTimeoutRef.current)
      lockTimeoutRef.current = null
    }
    updateSwipeDebug({ lock: false })
  }, [updateSwipeDebug])

  const startSwipeLock = useCallback(() => {
    swipeLockRef.current = true

    if (lockTimeoutRef.current) {
      window.clearTimeout(lockTimeoutRef.current)
    }

    lockTimeoutRef.current = window.setTimeout(() => {
      swipeLockRef.current = false
      lockTimeoutRef.current = null
      updateSwipeDebug({ lock: false })
    }, TRANSITION_LOCK_MS)
  }, [updateSwipeDebug])

  const resetTouchState = useCallback(() => {
    touchStartRef.current = null
  }, [])

  const navigateToTabIndex = useCallback((targetIndex) => {
    if (swipeLockRef.current) {
      updateSwipeDebug({ action: 'blocked: lock' })
      return false
    }

    if (activeTabIndex < 0) {
      updateSwipeDebug({ action: 'blocked: currentIndex -1' })
      return false
    }

    if (
      targetIndex < 0 ||
      targetIndex >= studentTabs.length ||
      targetIndex === activeTabIndex
    ) {
      updateSwipeDebug({
        action: targetIndex === activeTabIndex ? 'blocked: same tab' : 'blocked: edge tab',
      })
      return false
    }

    const targetPath = studentTabs[targetIndex]?.path
    if (!targetPath || targetPath === location.pathname) {
      updateSwipeDebug({ action: 'blocked: no target path' })
      return false
    }

    const direction = targetIndex > activeTabIndex ? 1 : -1
    if (DEBUG_STUDENT_SWIPE) {
      console.log('[StudentSwipe] navigate', {
        from: location.pathname,
        currentIndex: activeTabIndex,
        direction: direction > 0 ? 'next' : 'previous',
        to: targetPath,
      })
    }

    setSwipeDirection(direction)
    startSwipeLock()
    updateSwipeDebug({
      action: `navigating ${direction > 0 ? 'next' : 'previous'}`,
      targetPath,
    })

    navigate(targetPath)
    return true
  }, [activeTabIndex, location.pathname, navigate, startSwipeLock, updateSwipeDebug])

  const navigateBySwipe = useCallback((direction) => {
    if (swipeLockRef.current) {
      updateSwipeDebug({ action: 'blocked: lock' })
      return false
    }

    if (activeTabIndex < 0) {
      updateSwipeDebug({ action: 'blocked: currentIndex -1' })
      return false
    }

    const targetIndex =
      direction === 'next' ? activeTabIndex + 1 : activeTabIndex - 1

    return navigateToTabIndex(targetIndex)
  }, [activeTabIndex, navigateToTabIndex, updateSwipeDebug])

  const handleTabNavigate = useCallback((targetPath) => {
    const targetIndex = studentTabs.findIndex((tab) => tab.path === targetPath)
    return navigateToTabIndex(targetIndex)
  }, [navigateToTabIndex])

  const handleTouchStart = useCallback((event) => {
    if (event.touches.length !== 1) {
      resetTouchState()
      return
    }

    const ignoreReason = getSwipeIgnoreReason(event.target)
    const ignored = Boolean(ignoreReason)
    const touch = event.touches[0]

    updateSwipeDebug((previous) => ({
      touchStart: previous.touchStart + 1,
      startX: touch.clientX,
      startY: touch.clientY,
      ignored,
      ignoreReason,
      action: 'touch start',
    }))

    if (DEBUG_STUDENT_SWIPE) {
      console.log('[StudentSwipe] touch start', {
        path: location.pathname,
        currentIndex: activeTabIndex,
        x: touch.clientX,
        y: touch.clientY,
        target: event.target?.tagName,
        ignored,
        ignoreReason,
      })
    }

    if (swipeLockRef.current) {
      updateSwipeDebug({ action: 'blocked: lock on touch start' })
      resetTouchState()
      return
    }

    if (activeTabIndex === -1) {
      updateSwipeDebug({ action: 'blocked: currentIndex -1' })
      resetTouchState()
      return
    }

    if (ignored) {
      updateSwipeDebug({ action: `blocked: ${ignoreReason}` })
      resetTouchState()
      return
    }

    touchStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      latestX: touch.clientX,
      latestY: touch.clientY,
      startedAt: Date.now(),
      hasNavigated: false,
    }

    if (DEBUG_STUDENT_SWIPE) {
      console.log('[StudentSwipe] start', touchStartRef.current)
    }

    updateSwipeDebug({ action: 'touch start saved' })
  }, [activeTabIndex, resetTouchState, updateSwipeDebug])

  const getSwipeResult = useCallback((start, clientX, clientY) => {
    const deltaX = clientX - start.startX
    const deltaY = clientY - start.startY
    const isHorizontal =
      Math.abs(deltaX) >= SWIPE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_DOMINANCE

    return {
      deltaX,
      deltaY,
      isHorizontal,
      direction: deltaX < 0 ? 'next' : 'previous',
    }
  }, [])

  const handleWindowTouchMove = useCallback((event) => {
    const start = touchStartRef.current
    if (!start || start.hasNavigated) return
    if (event.touches.length !== 1) return

    updateSwipeDebug((previous) => ({
      touchMove: previous.touchMove + 1,
      action: 'touch move',
    }))

    const touch = event.touches[0]
    start.latestX = touch.clientX
    start.latestY = touch.clientY

    const { deltaX, deltaY, isHorizontal, direction } = getSwipeResult(
      start,
      touch.clientX,
      touch.clientY,
    )

    updateSwipeDebug({
      deltaX,
      deltaY,
      isHorizontal,
      commitSource: '',
      direction: isHorizontal ? direction : '',
      action: 'touch move',
    })
  }, [getSwipeResult, updateSwipeDebug])

  const handleWindowTouchEnd = useCallback(() => {
    const start = touchStartRef.current

    updateSwipeDebug((previous) => ({
      touchEnd: previous.touchEnd + 1,
      action: 'touch end',
    }))

    if (!start) {
      updateSwipeDebug({ action: 'blocked: no touch start' })
      return
    }

    if (start.hasNavigated) {
      resetTouchState()
      updateSwipeDebug({ action: 'ignored touch end after move commit' })
      return
    }

    const { deltaX, deltaY, isHorizontal, direction } = getSwipeResult(
      start,
      start.latestX,
      start.latestY,
    )

    resetTouchState()

    if (DEBUG_STUDENT_SWIPE) {
      console.log('[StudentSwipe] touch end check', {
        path: location.pathname,
        deltaX,
        deltaY,
        isHorizontal,
      })
    }

    updateSwipeDebug({
      deltaX,
      deltaY,
      isHorizontal,
      commitSource: isHorizontal ? 'end' : '',
      direction: isHorizontal ? direction : '',
      action: isHorizontal ? 'commit swipe on end' : 'blocked: not horizontal',
    })

    if (!isHorizontal) return

    didSwipeRef.current = true
    window.setTimeout(() => {
      didSwipeRef.current = false
    }, 0)

    navigateBySwipe(direction)
  }, [getSwipeResult, location.pathname, navigateBySwipe, resetTouchState, updateSwipeDebug])

  const handleWindowTouchCancel = useCallback(() => {
    resetTouchState()
    updateSwipeDebug({ action: 'touch cancel' })
  }, [resetTouchState, updateSwipeDebug])

  useEffect(() => {
    window.addEventListener('touchmove', handleWindowTouchMove, {
      passive: true,
    })
    window.addEventListener('touchend', handleWindowTouchEnd, {
      passive: true,
    })
    window.addEventListener('touchcancel', handleWindowTouchCancel, {
      passive: true,
    })

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove)
      window.removeEventListener('touchend', handleWindowTouchEnd)
      window.removeEventListener('touchcancel', handleWindowTouchCancel)
    }
  }, [handleWindowTouchCancel, handleWindowTouchEnd, handleWindowTouchMove])

  useEffect(() => {
    return () => {
      resetTouchState()
      clearSwipeLock()
    }
  }, [clearSwipeLock, resetTouchState])

  useEffect(() => {
    resetTouchState()

    const unlockAfterRouteSettles = window.setTimeout(() => {
      swipeLockRef.current = false
      updateSwipeDebug({ lock: false })
    }, 260)

    return () => window.clearTimeout(unlockAfterRouteSettles)
  }, [location.pathname, resetTouchState, updateSwipeDebug])

  useEffect(() => {
    if (!DEBUG_STUDENT_SWIPE) return undefined

    const id = window.setInterval(() => {
      if (swipeLockRef.current) {
        console.warn('[Swipe] lock still active', {
          path: location.pathname,
          hasTouch: Boolean(touchStartRef.current),
        })
      }
    }, 1000)

    return () => window.clearInterval(id)
  }, [location.pathname])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const root = document.documentElement
    if (root.scrollWidth > root.clientWidth) {
      console.warn('[Layout] Horizontal overflow detected', {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
      })
    }
  }, [location.pathname])

  const handleClickCapture = (event) => {
    if (!didSwipeRef.current) return

    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-slate-100">
      <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-white dark:bg-gray-950 lg:hidden">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0 py-0.5">
              <h1 className="truncate text-lg font-semibold leading-tight text-slate-900 dark:text-white">
                {pageTitle}
              </h1>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                Welcome, {userName}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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
                onClick={(event) => {
                  event.preventDefault()
                  handleTabNavigate('/student/profile')
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 active:scale-95 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                aria-label="Open profile"
              >
                <User size={18} />
              </NavLink>
            </div>
          </div>
        </header>

        <main
          className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto bg-white dark:bg-gray-950"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onClickCapture={handleClickCapture}
        >
          <div
            className="mx-auto w-full max-w-md px-4 pb-24 pt-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <AnimatePresence initial={false} mode="wait" custom={swipeDirection}>
              <motion.div
                key={location.pathname}
                custom={swipeDirection}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
                className="w-full"
                style={{
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className="space-y-4">
                <CanteenBanner />
                {outlet}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {DEBUG_STUDENT_SWIPE && (
          <div className="fixed bottom-24 left-3 z-[9999] rounded-lg bg-black/80 px-3 py-2 text-[10px] leading-snug text-white shadow-lg">
            <div className="font-semibold">[SwipeDebug]</div>
            <div>path: {location.pathname}</div>
            <div>index: {activeTabIndex}</div>
            <div>
              start: {swipeDebug.touchStart} move: {swipeDebug.touchMove} end:{' '}
              {swipeDebug.touchEnd}
            </div>
            <div>
              dx: {Math.round(swipeDebug.deltaX || 0)} dy:{' '}
              {Math.round(swipeDebug.deltaY || 0)}
            </div>
            <div>horizontal: {String(swipeDebug.isHorizontal)}</div>
            <div>
              ignored: {String(swipeDebug.ignored)}
              {swipeDebug.ignoreReason ? ` (${swipeDebug.ignoreReason})` : ''}
            </div>
            <div>lock: {String(swipeDebug.lock)}</div>
            <div>commit: {swipeDebug.commitSource || '-'}</div>
            <div>direction: {swipeDebug.direction || '-'}</div>
            <div>target: {swipeDebug.targetPath || '-'}</div>
            <div>action: {swipeDebug.action}</div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
          <div className="mx-auto flex w-full max-w-md items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom)]">
            <BottomNavItem
              to="/student/menu"
              icon={Home}
              label="Home"
              onClick={(event) => {
                event.preventDefault()
                handleTabNavigate('/student/menu')
              }}
            />
            <BottomNavItem
              to="/student/orders"
              icon={Receipt}
              label="Orders"
              onClick={(event) => {
                event.preventDefault()
                handleTabNavigate('/student/orders')
              }}
            />
            <BottomNavItem
              to="/student/cart"
              icon={ShoppingCart}
              label="Cart"
              badge={count}
              onClick={(event) => {
                event.preventDefault()
                handleTabNavigate('/student/cart')
              }}
            />
            <BottomNavItem
              to="/student/profile"
              icon={User}
              label="Profile"
              onClick={(event) => {
                event.preventDefault()
                handleTabNavigate('/student/profile')
              }}
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
