import { useState, useEffect } from 'react'
import { analyticsService } from '@/services/analytics'

/**
 * useAnalytics — fetches all analytics data for Admin/Chef dashboards.
 *
 * FIX BUG 17: old hook called getVendorPerformance() which hit the non-existent
 * /analytics/vendors endpoint → 404 on every admin page load.
 * Also: raw shapes from backend didn't match what Recharts components expected.
 * analyticsService now normalises all shapes before returning.
 *
 * @param {'daily'|'weekly'|'monthly'} period
 */
export function useAnalytics(period = 'weekly') {
  const [data, setData]       = useState({
    revenue:    [],
    topItems:   [],
    vendors:    [],      // now maps to categorySales (closest available data)
    categories: [],
    statusCounts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setLoading(true)
      setError(null)
      try {
        // FIX BUG 17: replaced getVendorPerformance() 404 with getCategoryBreakdown()
        const [revenue, topItems, categories, statusCounts] = await Promise.all([
          analyticsService.getRevenue(period),
          analyticsService.getTopItems(),
          analyticsService.getCategoryBreakdown(),
          analyticsService.getOrderStatusCounts(),
        ])
        if (!cancelled) {
          setData({
            revenue,
            topItems,
            vendors:      categories,   // alias for components that still read .vendors
            categories,
            statusCounts,
          })
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [period])

  return { ...data, loading, error }
}
