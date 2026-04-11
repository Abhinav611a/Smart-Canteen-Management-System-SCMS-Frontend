import React from 'react'

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3 animate-pulse">
      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-200 dark:bg-gray-700 rounded-full ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-full w-1/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
      </div>
      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )
}

export default SkeletonCard
