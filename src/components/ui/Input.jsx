import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(
  (
    {
      id,
      name,
      label,
      type = 'text',
      value,
      onChange,
      placeholder,
      error,
      icon,
      autoComplete,
      disabled = false,
      className = '',
      inputClassName = '',
      showPasswordToggle = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)

    const isPasswordField = type === 'password'
    const canTogglePassword = isPasswordField && showPasswordToggle
    const inputType = canTogglePassword
      ? showPassword
        ? 'text'
        : 'password'
      : type

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={id || name}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={id || name}
            name={name}
            type={inputType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            className={`
              w-full rounded-xl border bg-white/70 dark:bg-gray-900/60
              text-gray-900 dark:text-white placeholder:text-gray-400
              border-gray-300 dark:border-gray-700
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
              transition
              ${icon ? 'pl-10' : 'pl-4'}
              ${canTogglePassword ? 'pr-11' : 'pr-4'}
              py-3
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${disabled ? 'cursor-not-allowed opacity-60' : ''}
              ${inputClassName}
            `}
            {...props}
          />

          {canTogglePassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input