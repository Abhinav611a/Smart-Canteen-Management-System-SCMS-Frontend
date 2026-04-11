import React from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { CartProvider } from '@/context/CartContext'
import { BlockchainProvider } from '@/context/BlockchainContext'
import { NotificationProvider } from '@/context/NotificationContext'
import AppRoutes from '@/routes/AppRoutes'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BlockchainProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </BlockchainProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}