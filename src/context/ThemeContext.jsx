/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }) {
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

  const toggle = () => {
    setHasManualPreference(true)
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  const resetToSystemTheme = () => {
    setHasManualPreference(false)
    setTheme(getSystemTheme())
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle,
        setTheme,
        isDark: theme === 'dark',
        hasManualPreference,
        resetToSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}