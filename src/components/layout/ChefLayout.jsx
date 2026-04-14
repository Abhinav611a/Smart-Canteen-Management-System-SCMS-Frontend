import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useOrders } from '@/hooks/useOrders'
import CanteenBanner from '@/components/ui/CanteenBanner'

export default function ChefLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { orders } = useOrders('monitor')
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

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
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}