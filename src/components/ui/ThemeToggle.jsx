import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
    </button>
  )
}
