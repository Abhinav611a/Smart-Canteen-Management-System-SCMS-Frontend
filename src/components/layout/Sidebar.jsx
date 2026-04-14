import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Sidebar({ navItems, open, onClose }) {
  const { user } = useAuth()

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[260px]
          bg-white dark:bg-gray-950
          border-r border-gray-100 dark:border-gray-800
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white text-base">
              🍽
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white leading-none text-sm">CanteenDAO</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden btn-ghost p-1.5">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            if (item.type === 'divider') {
              return (
                <div key={item.label} className="pt-4 pb-1 px-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold">{item.label}</p>
                </div>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="text-lg w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
