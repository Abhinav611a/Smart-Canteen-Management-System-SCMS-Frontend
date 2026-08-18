import { useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const buttonRef = useRef(null)
  const { isDark, toggleThemeWithTransition, isThemeTransitioning } = useTheme()

  const handleClick = (event) => {
    if (import.meta.env.DEV) {
      console.log('[ThemeButton] clicked', {
        hasAnimateToggle: typeof toggleThemeWithTransition === 'function',
        hasButtonRef: Boolean(buttonRef.current),
      })
    }

    toggleThemeWithTransition(event.currentTarget || buttonRef.current)
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={isThemeTransitioning}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      type="button"
    >
      <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
    </button>
  )
}
