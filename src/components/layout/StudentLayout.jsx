import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useCart } from '@/context/CartContext'

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { count } = useCart()

  const navItems = [
    { type: 'divider', label: 'Student' },
    { to: '/student/menu',    icon: '🍽', label: 'Browse Menu' },
    { to: '/student/cart',    icon: '🛒', label: 'My Cart',     badge: count },
    { to: '/student/orders',  icon: '📦', label: 'My Orders' },
    { to: '/student/profile', icon: '👤', label: 'Profile' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar navItems={navItems} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
