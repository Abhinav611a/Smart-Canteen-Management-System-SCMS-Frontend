import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Modal — accessible portal-based dialog.
 *
 * Usage:
 *   <Modal open={open} onClose={() => setOpen(false)} title="Edit Item" size="md">
 *     content…
 *   </Modal>
 */
export default function Modal({ open, onClose, title, children, size = 'md', hideClose = false }) {
  // Trap scroll and handle Esc key
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

  const sizes = {
    sm:  'max-w-sm',
    md:  'max-w-lg',
    lg:  'max-w-2xl',
    xl:  'max-w-4xl',
    full:'max-w-full mx-4',
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none`}
          >
            <div className={`w-full ${sizes[size]} glass-card-solid pointer-events-auto overflow-hidden`}>
              {/* Header */}
              {(title || !hideClose) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  {title && (
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {!hideClose && (
                    <button
                      onClick={onClose}
                      className="ml-auto w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Close modal"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/**
 * ModalFooter — sticky footer for modal action buttons
 */
export function ModalFooter({ children }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
      {children}
    </div>
  )
}
