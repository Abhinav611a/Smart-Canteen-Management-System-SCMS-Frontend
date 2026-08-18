/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import ThemeTransitionOverlay from '@/components/common/ThemeTransitionOverlay'

const ThemeContext = createContext(null)

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }) {
  const switchTimeoutRef = useRef(null)
  const completeTimeoutRef = useRef(null)
  const emergencyTimeoutRef = useRef(null)
  const isThemeAnimatingRef = useRef(false)
  const activeTransitionIdRef = useRef(null)
  const transitionIdRef = useRef(0)
  const [themeTransition, setThemeTransition] = useState(null)
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false)

  const [hasManualPreference, setHasManualPreference] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('canteen_theme')
  })

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'

    const stored = localStorage.getItem('canteen_theme')
    if (stored === 'light' || stored === 'dark') return stored

    return getSystemTheme()
  })

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (hasManualPreference) {
      localStorage.setItem('canteen_theme', theme)
    } else {
      localStorage.removeItem('canteen_theme')
    }
  }, [theme, hasManualPreference])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event) => {
      if (!hasManualPreference) {
        setTheme(event.matches ? 'dark' : 'light')
      }
    }

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [hasManualPreference])

  const clearThemeTimers = useCallback(() => {
    if (switchTimeoutRef.current) {
      window.clearTimeout(switchTimeoutRef.current)
      switchTimeoutRef.current = null
    }
    if (completeTimeoutRef.current) {
      window.clearTimeout(completeTimeoutRef.current)
      completeTimeoutRef.current = null
    }
    if (emergencyTimeoutRef.current) {
      window.clearTimeout(emergencyTimeoutRef.current)
      emergencyTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return clearThemeTimers
  }, [clearThemeTimers])

  const finishThemeTransition = useCallback((id) => {
    if (id && activeTransitionIdRef.current && id !== activeTransitionIdRef.current) {
      return
    }

    if (import.meta.env.DEV) {
      console.log('[ThemeRipple] complete', { id: id || activeTransitionIdRef.current })
    }

    clearThemeTimers()
    isThemeAnimatingRef.current = false
    activeTransitionIdRef.current = null
    setThemeTransition(null)
    setIsThemeTransitioning(false)
  }, [clearThemeTimers])

  const toggleThemeWithTransition = useCallback((originElement) => {
    if (isThemeAnimatingRef.current) return

    setHasManualPreference(true)

    const targetTheme = theme === 'dark' ? 'light' : 'dark'

    if (typeof window === 'undefined') {
      setTheme(targetTheme)
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (import.meta.env.DEV) {
      console.log('[ThemeRipple] reduced motion', prefersReducedMotion)
    }

    if (prefersReducedMotion) {
      setTheme(targetTheme)
      return
    }

    clearThemeTimers()

    const element =
      originElement?.current ||
      originElement?.currentTarget ||
      originElement?.target ||
      originElement
    const rect = element?.getBoundingClientRect?.()
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth - 40
    const originY = rect ? rect.top + rect.height / 2 : 40
    const farthestX = Math.max(originX, window.innerWidth - originX)
    const farthestY = Math.max(originY, window.innerHeight - originY)
    const radius = Math.ceil(Math.hypot(farthestX, farthestY) + 72)
    const id = `${Date.now()}-${++transitionIdRef.current}`

    isThemeAnimatingRef.current = true
    activeTransitionIdRef.current = id
    setIsThemeTransitioning(true)

    if (import.meta.env.DEV) {
      console.log('[ThemeRipple] start', { id, targetTheme })
    }

    setThemeTransition({
      id,
      originX,
      originY,
      radius,
      fromTheme: theme,
      toTheme: targetTheme,
    })

    switchTimeoutRef.current = window.setTimeout(() => {
      if (import.meta.env.DEV) {
        console.log('[ThemeRipple] switch', { id, targetTheme })
      }

      setTheme(targetTheme)
      switchTimeoutRef.current = null
    }, 220)

    completeTimeoutRef.current = window.setTimeout(
      () => finishThemeTransition(id),
      720,
    )

    emergencyTimeoutRef.current = window.setTimeout(() => {
      if (activeTransitionIdRef.current !== id) return

      if (import.meta.env.DEV) {
        console.log('[ThemeRipple] complete', { id, emergency: true })
      }

      clearThemeTimers()
      isThemeAnimatingRef.current = false
      activeTransitionIdRef.current = null
      setIsThemeTransitioning(false)
      setThemeTransition(null)
    }, 1200)
  }, [clearThemeTimers, finishThemeTransition, theme])

  const resetToSystemTheme = () => {
    setHasManualPreference(false)
    setTheme(getSystemTheme())
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: toggleThemeWithTransition,
        toggleThemeWithTransition,
        setTheme,
        isDark: theme === 'dark',
        hasManualPreference,
        isThemeTransitioning,
        resetToSystemTheme,
      }}
    >
      {children}
      {themeTransition ? (
        <ThemeTransitionOverlay
          key={themeTransition.id}
          transition={themeTransition}
        />
      ) : null}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
