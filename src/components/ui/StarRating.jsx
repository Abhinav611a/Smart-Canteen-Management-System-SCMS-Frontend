import { useState } from 'react'

/**
 * StarRating — interactive 1-5 star rating selector
 *
 * Usage:
 *   <StarRating value={rating} onChange={setRating} size="md" />
 */
export default function StarRating({
  value = 0,
  onChange,
  size = 'md',
  disabled = false,
  className = '',
}) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleClick = (rating) => {
    if (disabled) return
    onChange?.(rating)
  }

  const handleMouseEnter = (rating) => {
    if (disabled) return
    setHoverValue(rating)
  }

  const handleMouseLeave = () => {
    if (disabled) return
    setHoverValue(0)
  }

  const displayValue = hoverValue || value

  return (
    <div className={`flex gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
          className={`transition-colors ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:scale-110'
          }`}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <svg
            className={`${sizes[size]} ${
              star <= displayValue
                ? 'text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}