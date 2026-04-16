import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useOrders } from '@/hooks/useOrders'
import { useCanteen } from '@/context/CanteenContext'
import CanteenBanner from '@/components/ui/CanteenBanner'
import CanteenReadinessCard from '@/components/ui/CanteenReadinessCard'
import { managerService } from '@/services/managerService'

export default function ChefLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [markingReady, setMarkingReady] = useState(false)
  const [submittedReady, setSubmittedReady] = useState(false)

  const { orders } = useOrders('monitor')
  const canteen = useCanteen()
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  useEffect(() => {
    if (!canteen.isOpening || canteen.managerReady) {
      setSubmittedReady(false)
    }
  }, [canteen.isOpening, canteen.managerReady])

  const managerReadyConfirmed = canteen.managerReady || submittedReady

  const handleManagerReady = async () => {
    if (!canteen.isOpening || managerReadyConfirmed || markingReady) return

    setMarkingReady(true)

    try {
      await managerService.markReady()
      setSubmittedReady(true)
      toast.success(
        canteen.kitchenReady
          ? 'Manager readiness confirmed. Waiting for canteen to open.'
          : 'Manager readiness confirmed. Waiting for kitchen readiness.'
      )
    } catch (error) {
      toast.error(error?.message || 'Failed to confirm manager readiness.')
    } finally {
      setMarkingReady(false)
    }
  }

  const navItems = [
    { type: 'divider', label: 'Chef Panel' },
    {
      to: '/chef/orders',
      icon: '🎫',
      label: 'Live Orders',
      badge: pendingCount,
    },
    { to: '/chef/menu', icon: '📋', label: 'My Menu' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar
        navItems={navItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            <CanteenBanner />
            {canteen.isOpening && (
              <CanteenReadinessCard
                actionLabel="I'm Ready"
                actionLoadingLabel="Confirming Readiness..."
                confirmedLabel="Manager Ready"
                confirmed={managerReadyConfirmed}
                managerReady={canteen.managerReady}
                kitchenReady={canteen.kitchenReady}
                onAction={handleManagerReady}
                loading={markingReady}
              />
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
