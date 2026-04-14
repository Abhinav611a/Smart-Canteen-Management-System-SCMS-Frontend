import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { getRoleHome } from '@/utils/helpers'
import Button from '@/components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="text-8xl mb-6"
        >
          🍽
        </motion.div>

        <h1 className="text-8xl font-black text-gray-200 dark:text-gray-800 leading-none">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Page not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">
          Oops! This page went off-menu. Let&apos;s get you back.
        </p>

        <div className="flex gap-3 justify-center mt-8">
          <Button onClick={() => navigate(-1)} variant="secondary">Go Back</Button>
          <Button onClick={() => navigate(isAuthenticated ? getRoleHome(role) : '/login')}>
            Go Home
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
