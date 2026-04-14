import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Drawer({ open, onClose, title, children, width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed top-0 right-0 bottom-0 z-50 w-full ${width} bg-white dark:bg-gray-950 border-l border-gray-100 dark:border-gray-800 flex flex-col shadow-2xl`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                ✕
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
