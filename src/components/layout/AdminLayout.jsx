import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { type: 'divider', label: 'Admin Panel' },
    { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/admin/analytics', icon: '📈', label: 'Analytics' },
    { to: '/admin/orders', icon: '📦', label: 'All Orders' },
    { to: '/admin/pos', icon: '🧾', label: 'POS' },
    { to: '/admin/menu', icon: '🍴', label: 'Manage Menu' },
    { to: '/admin/users', icon: '👥', label: 'Users' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar
        navItems={navItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
