import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { CartProvider } from '@/context/CartContext'
import { BlockchainProvider } from '@/context/BlockchainContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { CanteenProvider } from '@/context/CanteenContext' // ✅ ADD THIS
import AppRoutes from '@/routes/AppRoutes'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BlockchainProvider>
            <CanteenProvider> {/* ✅ WRAP HERE */}
              <CartProvider>
                <AppRoutes />
              </CartProvider>
            </CanteenProvider>
          </BlockchainProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}