import { createPortal } from 'react-dom'

const SURFACE_COLORS = {
  light: '#f8fafc',
  dark: '#030712',
}

const EDGE_COLORS = {
  light: 'rgba(255, 255, 255, 0.28)',
  dark: 'rgba(15, 23, 42, 0.3)',
}

export default function ThemeTransitionOverlay({ transition }) {
  if (!transition || typeof document === 'undefined') return null

  const { originX, originY, radius, fromTheme, toTheme } = transition
  const diameter = radius * 2

  return createPortal(
    <div
      className="theme-transition-overlay"
      style={{
        '--theme-ripple-x': `${originX}px`,
        '--theme-ripple-y': `${originY}px`,
        '--theme-ripple-diameter': `${diameter}px`,
        '--theme-ripple-from': SURFACE_COLORS[fromTheme],
        '--theme-ripple-to': SURFACE_COLORS[toTheme],
        '--theme-ripple-edge': EDGE_COLORS[toTheme],
      }}
      aria-hidden="true"
    >
      <div
        key={`edge-${transition.id}`}
        className="theme-transition-circle theme-transition-circle-edge"
      />
      <div
        key={`main-${transition.id}`}
        className="theme-transition-circle theme-transition-circle-main"
      />
    </div>,
    document.body,
  )
}
