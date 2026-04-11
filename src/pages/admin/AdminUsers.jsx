import React, { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Search,
  GraduationCap,
  ChefHat,
  Shield,
  UtensilsCrossed,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  PencilLine,
  Hash,
  AlertCircle,
} from 'lucide-react'

import api from '@/services/api'
import { ENDPOINTS } from '@/utils/constants'
import { getInitials } from '@/utils/helpers'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import Button from '@/components/ui/Button'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'

const BACKEND_ROLES = ['USER', 'MANAGER', 'ADMIN', 'KITCHEN']
const ROLE_TABS = ['ALL', ...BACKEND_ROLES]

const ROLE_META = {
  USER: {
    label: 'User',
    icon: GraduationCap,
    badgeClass:
      'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300',
  },
  MANAGER: {
    label: 'Manager',
    icon: ChefHat,
    badgeClass:
      'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  },
  ADMIN: {
    label: 'Admin',
    icon: Shield,
    badgeClass:
      'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300',
  },
  KITCHEN: {
    label: 'Kitchen',
    icon: UtensilsCrossed,
    badgeClass:
      'border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300',
  },
}

function normalizeRole(role) {
  const value = String(role || '')
    .trim()
    .toUpperCase()

  return BACKEND_ROLES.includes(value) ? value : 'USER'
}

function normalizeActive(user = {}) {
  if (typeof user.active === 'boolean') return user.active
  if (typeof user.isActive === 'boolean') return user.isActive
  if (typeof user.enabled === 'boolean') return user.enabled

  if (typeof user.status === 'string') {
    return user.status.trim().toUpperCase() === 'ACTIVE'
  }

  if (typeof user.accountStatus === 'string') {
    return user.accountStatus.trim().toUpperCase() === 'ACTIVE'
  }

  return false
}

function normalizeUser(user = {}) {
  const active = normalizeActive(user)

  return {
    ...user,
    id: user.id ?? null,
    name:
      user.name ||
      user.fullName ||
      user.username ||
      user.email ||
      'User',
    email: user.email || '',
    role: normalizeRole(user.role),
    active,
    statusLabel: active ? 'Active' : 'Inactive',
  }
}

function getUserKey(user, index) {
  if (user?.id !== null && user?.id !== undefined && user?.id !== '') {
    return `user-${user.id}`
  }

  if (user?.email) {
    return `user-email-${user.email}`
  }

  return `user-fallback-${index}`
}

function StatusChip({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
          : 'border-gray-500/20 bg-gray-500/10 text-gray-500 dark:text-gray-300'
      }`}
    >
      {active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function RoleChip({ role }) {
  const safeRole = normalizeRole(role)
  const meta = ROLE_META[safeRole] ?? {
    label: 'User',
    icon: UserIcon,
    badgeClass:
      'border-gray-500/20 bg-gray-500/10 text-gray-500 dark:text-gray-300',
  }

  const Icon = meta.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${meta.badgeClass}`}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  )
}

function InlineFeedback({ type = 'info', message }) {
  if (!message) return null

  const styles = {
    success:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    error:
      'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    info: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  }

  const Icon = type === 'error' ? AlertCircle : CheckCircle2

  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${styles[type] || styles.info}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function UserCardSkeleton() {
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-52 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="flex gap-2 pt-2">
              <div className="h-7 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-7 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="glass-card rounded-3xl px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-brand-500/20 bg-brand-500/10 text-brand-500">
        <Users size={30} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        No users found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        No users match the selected filter or search query. Try changing the
        role filter, clearing the search, or updating a user manually by ID.
      </p>
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [rawSearch, setRawSearch] = useState('')
  const [roleModal, setRoleModal] = useState(null)
  const [newRole, setNewRole] = useState('USER')
  const [savingRole, setSavingRole] = useState(false)

  const [manualUserId, setManualUserId] = useState('')
  const [manualRole, setManualRole] = useState('USER')
  const [manualSaving, setManualSaving] = useState(false)

  const [fetchFeedback, setFetchFeedback] = useState({
    type: '',
    message: '',
  })
  const [actionFeedback, setActionFeedback] = useState({
    type: '',
    message: '',
  })

  const search = useDebounce(rawSearch, 300)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchFeedback({ type: '', message: '' })

    try {
      const params = roleFilter === 'ALL' ? {} : { role: roleFilter }
      const data = await api.get(ENDPOINTS.ADMIN_USERS, { params })

      console.log('ADMIN_USERS raw response:', data)

      const normalizedUsers = Array.isArray(data)
        ? data.map((user) => normalizeUser(user))
        : []

      setUsers(normalizedUsers)
    } catch (err) {
      console.error('Failed to load users:', err)
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load users.'

      setFetchFeedback({
        type: 'error',
        message,
      })

      toast.error(message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return users.filter((u) => {
      if (!q) return true

      return (
        String(u?.id ?? '').toLowerCase().includes(q) ||
        String(u?.name ?? '').toLowerCase().includes(q) ||
        String(u?.email ?? '').toLowerCase().includes(q) ||
        String(u?.role ?? '').toLowerCase().includes(q) ||
        String(u?.statusLabel ?? '').toLowerCase().includes(q)
      )
    })
  }, [users, search])

  const {
    page,
    totalPages,
    paginated,
    goTo,
    next,
    prev,
    canNext,
    canPrev,
    reset,
  } = usePagination(filtered, 9)

  const openRoleChange = (user) => {
    const currentRole = normalizeRole(user.role)

    setActionFeedback({ type: '', message: '' })
    setRoleModal({
      userId: user.id,
      name: user.name,
      currentRole,
    })
    setNewRole(currentRole)
  }

  const handleRoleChange = async () => {
    if (!roleModal?.userId) {
      setActionFeedback({
        type: 'error',
        message: 'Invalid user selected.',
      })
      toast.error('Invalid user selected')
      return
    }

    setSavingRole(true)
    setActionFeedback({ type: '', message: '' })

    try {
      await api.patch(ENDPOINTS.ADMIN_USER_ROLE(roleModal.userId), {
        role: newRole,
      })

      await fetchUsers()

      const message = `${roleModal.name || `User #${roleModal.userId}`} updated to ${newRole}.`
      setActionFeedback({
        type: 'success',
        message,
      })
      toast.success(message)
      setRoleModal(null)
    } catch (err) {
      console.error('Role update failed:', err)
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Role update failed.'

      setActionFeedback({
        type: 'error',
        message,
      })
      toast.error(message)
    } finally {
      setSavingRole(false)
    }
  }

  const handleManualRoleUpdate = async () => {
    const trimmedId = String(manualUserId).trim()

    if (!trimmedId) {
      setActionFeedback({
        type: 'error',
        message: 'User ID is required.',
      })
      toast.error('User ID is required')
      return
    }

    if (!/^\d+$/.test(trimmedId)) {
      setActionFeedback({
        type: 'error',
        message: 'User ID must be numeric.',
      })
      toast.error('User ID must be numeric')
      return
    }

    setManualSaving(true)
    setActionFeedback({ type: '', message: '' })

    try {
      await api.patch(ENDPOINTS.ADMIN_USER_ROLE(trimmedId), {
        role: manualRole,
      })

      await fetchUsers()

      const message = `User #${trimmedId} updated to ${manualRole}.`
      setActionFeedback({
        type: 'success',
        message,
      })

      toast.success(message)
      setManualUserId('')
      setManualRole('USER')
    } catch (err) {
      console.error('Manual role update failed:', err)
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Manual role update failed.'

      setActionFeedback({
        type: 'error',
        message,
      })
      toast.error(message)
    } finally {
      setManualSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage user roles, search accounts, and monitor active status from
            one place.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchUsers}>
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={14} />
            Refresh
          </span>
        </Button>
      </div>

      <InlineFeedback
        type={fetchFeedback.type}
        message={fetchFeedback.message}
      />
      <InlineFeedback
        type={actionFeedback.type}
        message={actionFeedback.message}
      />

      <div className="glass-card rounded-3xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Manual Role Update
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Update any user directly by ID.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_auto]">
          <Input
            id="manual-user-id"
            name="manualUserId"
            label="User ID"
            placeholder="Enter user ID"
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            icon="#"
          />

          <div>
            <label htmlFor="manual-role" className="input-label">
              Role
            </label>
            <select
              id="manual-role"
              name="manualRole"
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value)}
              className="input-field"
            >
              {BACKEND_ROLES.map((role) => (
                <option key={`manual-role-${role}`} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button onClick={handleManualRoleUpdate} loading={manualSaving}>
              Update Role
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            id="user-search"
            name="userSearch"
            className="input-field pl-10"
            placeholder="Search by ID, name, email, role or status…"
            value={rawSearch}
            onChange={(e) => {
              setRawSearch(e.target.value)
              reset()
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ROLE_TABS.map((role) => {
            const isActive = roleFilter === role
            const Icon =
              role === 'ALL'
                ? Users
                : (ROLE_META[role]?.icon ?? UserIcon)

            return (
              <button
                key={`role-tab-${role}`}
                type="button"
                onClick={() => {
                  setRoleFilter(role)
                  reset()
                }}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'border-brand-500 bg-brand-500 text-white shadow-glow'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={14} />
                {role}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <UserCardSkeleton key={`user-skeleton-${index}`} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((user, index) => {
              const safeRole = normalizeRole(user.role)

              return (
                <div
                  key={getUserKey(user, index)}
                  className="glass-card rounded-3xl border border-white/5 p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {getInitials(user.name || `U${user.id ?? index}`)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-gray-900 dark:text-white">
                            {user.name || `User #${user.id ?? 'N/A'}`}
                          </p>
                          <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                            {user.email || 'No email available'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                        <Hash size={12} />
                        <span>ID: {user.id ?? 'N/A'}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <RoleChip role={safeRole} />
                        <StatusChip active={user.active} />
                      </div>

                      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => openRoleChange(user)}
                          className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
                        >
                          <PencilLine size={13} />
                          Change Role
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages} · {filtered.length} users
              </p>
              <Pagination
                page={page}
                totalPages={totalPages}
                onNext={next}
                onPrev={prev}
                onGoTo={goTo}
                canNext={canNext}
                canPrev={canPrev}
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={!!roleModal}
        onClose={() => setRoleModal(null)}
        title={`Change Role — ${roleModal?.name || `User #${roleModal?.userId}`}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update the selected user's role.
          </p>

          <div className="rounded-2xl border border-gray-200/70 bg-gray-50/70 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            Endpoint: <code>PATCH /admin/users/{roleModal?.userId}/role</code>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {BACKEND_ROLES.map((role) => {
              const meta = ROLE_META[role]
              const Icon = meta?.icon ?? UserIcon
              const isSelected = newRole === role

              return (
                <button
                  key={`modal-role-${role}`}
                  type="button"
                  onClick={() => setNewRole(role)}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <Icon size={15} />
                  <span>{role}</span>
                </button>
              )
            })}
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setRoleModal(null)}>
            Cancel
          </Button>
          <Button
            onClick={handleRoleChange}
            loading={savingRole}
            disabled={newRole === roleModal?.currentRole}
          >
            Update Role
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}