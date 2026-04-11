import React from 'react'

export default function Pagination({ page, totalPages, onNext, onPrev, onGoTo, canNext, canPrev }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const visible = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={onPrev}
        disabled={!canPrev}
        className="btn-ghost px-3 py-2 disabled:opacity-30"
      >
        ←
      </button>

      {visible.map((p, idx) => {
        const prev = visible[idx - 1]
        const showEllipsis = prev && p - prev > 1
        return (
          <React.Fragment key={p}>
            {showEllipsis && <span className="px-2 text-gray-400 text-sm">…</span>}
            <button
              onClick={() => onGoTo(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? 'bg-brand-500 text-white shadow-glow'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          </React.Fragment>
        )
      })}

      <button
        onClick={onNext}
        disabled={!canNext}
        className="btn-ghost px-3 py-2 disabled:opacity-30"
      >
        →
      </button>
    </div>
  )
}
