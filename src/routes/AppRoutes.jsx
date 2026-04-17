/**
 * AppRoutes.jsx
 */

import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getRoleHome } from '@/utils/helpers'
import PageLoader from '@/components/ui/PageLoader'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

// Public auth pages
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import OAuthSuccess from '@/pages/auth/OAuthSuccess'

// User
const StudentLayout = lazy(() => import('@/components/layout/StudentLayout'))
const StudentMenu = lazy(() => import('@/pages/student/Menu'))
const StudentCart = lazy(() => import('@/pages/student/Cart'))
const StudentOrders = lazy(() => import('@/pages/student/Orders'))
const StudentProfile = lazy(() => import('@/pages/student/Profile'))
const OrderInvoices = lazy(() => import('@/pages/student/OrderInvoices'))

// Manager
const ChefLayout = lazy(() => import('@/components/layout/ChefLayout'))
const ChefOrders = lazy(() => import('@/pages/chef/ChefOrders'))
const ChefMenu = lazy(() => import('@/pages/chef/ChefMenu'))
const ExternalScanner = lazy(() => import('@/pages/manager/ExternalScanner'))

// Kitchen
const KitchenLayout = lazy(() => import('@/components/layout/KitchenLayout'))
const KitchenDashboard = lazy(() => import('@/pages/kitchen/KitchenDashboard'))

// Admin
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminMenu = lazy(() => import('@/pages/admin/AdminMenu'))
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'))

const NotFound = lazy(() => import('@/pages/NotFound'))

function RequireRole({ role, children }) {
  const { isAuthenticated, user, loading } = useAuth()
  const userRole = String(user?.role || '').toUpperCase()
  const requiredRole = String(role || '').toUpperCase()

  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!userRole) return <Navigate to="/login" replace />

  if (userRole !== requiredRole) {
    return <Navigate to={getRoleHome(userRole)} replace />
  }

  return children
}

function PublicOnly({ children }) {
  const { isAuthenticated, user, loading } = useAuth()
  const role = String(user?.role || '').toUpperCase()

  if (loading) return <PageLoader />

  if (isAuthenticated && role) {
    return <Navigate to={getRoleHome(role)} replace />
  }

  return children
}

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth()
  const role = String(user?.role || '').toUpperCase()

  if (loading) return <PageLoader />

  return (
    <Navigate
      to={isAuthenticated && role ? getRoleHome(role) : '/login'}
      replace
    />
  )
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />

          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />

          <Route
            path="/forgot-password"
            element={
              <PublicOnly>
                <ForgotPassword />
              </PublicOnly>
            }
          />

          <Route
            path="/reset-password"
            element={
              <PublicOnly>
                <ResetPassword />
              </PublicOnly>
            }
          />

          <Route path="/oauth-success" element={<OAuthSuccess />} />
          <Route path="/manager/external-scanner" element={<ExternalScanner />} />

          <Route
            path="/student"
            element={
              <RequireRole role="USER">
                <StudentLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="menu" replace />} />
            <Route path="menu" element={<StudentMenu />} />
            <Route path="cart" element={<StudentCart />} />
            <Route path="orders" element={<StudentOrders />} />
            <Route path="invoices" element={<OrderInvoices />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          <Route
            path="/chef"
            element={
              <RequireRole role="MANAGER">
                <ChefLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<ChefOrders />} />
            <Route path="menu" element={<ChefMenu />} />
          </Route>

          <Route
            path="/kitchen"
            element={
              <RequireRole role="KITCHEN">
                <KitchenLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<KitchenDashboard />} />
          </Route>

          <Route
            path="/admin"
            element={
              <RequireRole role="ADMIN">
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
