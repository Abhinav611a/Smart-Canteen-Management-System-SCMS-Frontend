import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useMenu } from '@/hooks/useMenu'
import { menuService } from '@/services/menu'
import { formatCurrency } from '@/utils/helpers'
import { MENU_CATEGORIES, MENU_CATEGORY_LABELS, MENU_CATEGORY_EMOJIS } from '@/utils/constants'
import { validateMenuItem, hasErrors } from '@/utils/validators'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function ChefMenu() {
  const { menu, loading, toggleItem, addItem, removeItem, updateItem } = useMenu()

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null) // item being edited, null = add new
  const [form, setForm]             = useState({ name: '', category: 'MAIN', foodCategory: 'MAIN', price: '', emoji: '🍛', description: '' })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving]         = useState(false)

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', category: 'MAIN', foodCategory: 'MAIN', price: '', emoji: '🍛', description: '' })
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name, category: item.category, foodCategory: item.category, price: String(item.price), emoji: item.emoji || MENU_CATEGORY_EMOJIS[item.category] || '🍴', description: item.description || '' })
    setFormErrors({})
    setShowModal(true)
  }

  const handleSave = async () => {
    const errors = validateMenuItem(form)
    if (hasErrors(errors)) { setFormErrors(errors); return }

    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price) }
      if (editing) {
        await updateItem(editing.id, payload)
        toast.success(`${form.name} updated!`)
      } else {
        const created = await menuService.create(payload)
        addItem(created)
        toast.success(`${form.name} added to menu!`)
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return
    try {
      await removeItem(item.id)
      toast.success('Item removed')
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const handleToggle = async (item) => {
    try {
      await toggleItem(item.id)
      toast.success(`${item.name} is now ${item.available ? 'unavailable' : 'available'}`)
    } catch {
      toast.error('Failed to update item')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">My Menu 📋</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {menu.length} items · {menu.filter(i => i.available).length} available
          </p>
        </div>
        <Button icon="➕" onClick={openAdd}>Add Item</Button>
      </div>

      {loading ? (
        <div className="glass-card overflow-hidden p-4"><SkeletonTable rows={5} /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th><th>Category</th><th>Price</th><th>Today</th><th>Rating</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menu.map(item => (
                  <motion.tr key={item.id} layout>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-400 max-w-[180px] truncate">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-gray">{MENU_CATEGORY_EMOJIS[item.category]} {MENU_CATEGORY_LABELS[item.category] ?? item.category}</span></td>
                    <td className="font-semibold">{formatCurrency(item.price)}</td>
                    <td className="text-center font-medium">{item.ordersToday}</td>
                    <td><span className="text-amber-500">⭐ {item.rating}</span></td>
                    <td>
                      <span className={item.available ? 'badge badge-green' : 'badge badge-red'}>
                        {item.available ? '✅ On' : '❌ Off'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleToggle(item)}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                            item.available
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100'
                              : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {item.available ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit: ${editing.name}` : 'Add New Menu Item'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Item Name"
              className="col-span-2"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              error={formErrors.name}
              placeholder="e.g. Pasta Carbonara"
            />
            <Input
              label="Price (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              error={formErrors.price}
              placeholder="9.99"
              icon="💵"
            />
            <Input
              label="Emoji Icon"
              value={form.emoji}
              onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
              placeholder="🍝"
            />
            <div>
              <label className="input-label">Category</label>
              <select
                value={form.foodCategory ?? form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value, foodCategory: e.target.value, emoji: MENU_CATEGORY_EMOJIS[e.target.value] || '🍴' }))}
                className="input-field"
              >
                {MENU_CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{MENU_CATEGORY_EMOJIS[c]} {MENU_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <Input
              label="Description"
              className="col-span-2"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of the dish…"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>
            {editing ? 'Save Changes' : 'Add Item'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
