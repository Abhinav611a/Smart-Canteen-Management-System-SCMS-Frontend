import React from 'react'

const VARIANTS = {
  green:  'badge-green',
  yellow: 'badge-yellow',
  red:    'badge-red',
  blue:   'badge-blue',
  gray:   'badge-gray',
}

export default function Badge({ variant = 'gray', icon, children, className = '' }) {
  return (
    <span className={`badge ${VARIANTS[variant] || VARIANTS.gray} ${className}`}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  )
}
