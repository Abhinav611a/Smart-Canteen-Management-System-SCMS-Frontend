import { useState, useMemo } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/utils/constants'

export function usePagination(items = [], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const goTo     = (p)  => setPage(Math.max(1, Math.min(p, totalPages)))
  const next     = ()   => goTo(page + 1)
  const prev     = ()   => goTo(page - 1)
  const canNext  = page < totalPages
  const canPrev  = page > 1

  // Reset to page 1 when items change significantly
  const reset = () => setPage(1)

  return { page, totalPages, paginated, goTo, next, prev, canNext, canPrev, reset }
}
