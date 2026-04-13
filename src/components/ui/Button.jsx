import React from 'react'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  warning: 'btn-warning',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: '',
  lg: 'text-base px-6 py-3',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`relative overflow-hidden ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0 relative z-[1]">{icon}</span>
      ) : null}

      <span className="relative z-[1]">{children}</span>

      {iconRight && !loading && (
        <span className="shrink-0 relative z-[1]">{iconRight}</span>
      )}
    </button>
  )
}