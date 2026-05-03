import { useEffect, useState } from 'react'
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

const DEFAULT_FORM = {
  name: '',
  category: 'MAIN',
  foodCategory: 'MAIN',
  price: '',
  emoji: 'ðŸ›',
  description: '',
  isPreparedItem: true,
  imageUrl: null,
  maxPerOrder: null,
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

function validateImageFile(file) {
  if (!file) return null
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Choose a JPEG, PNG, or WebP image. SVG, GIF, BMP, HEIC, and other image types are not allowed.'
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 2 MB or smaller'
  }
  return null
}

async function uploadMenuImage(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary upload is not configured')
  }

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    throw new Error('Image upload failed')
  }

  const data = await response.json()
  if (!data.secure_url) {
    throw new Error('Cloudinary did not return an image URL')
  }

  return data.secure_url
}

function getFoodTypeMeta(isPreparedItem) {
  if (isPreparedItem === true) {
    return { label: 'Cooked', className: 'badge-yellow' }
  }

  if (isPreparedItem === false) {
    return { label: 'Readymade', className: 'badge-blue' }
  }

  return { label: 'Unknown', className: 'badge-gray' }
}

export default function AdminMenu() {
  const { menu, loading, toggleItem, addItem, removeItem, updateItem } = useMenu()
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('All')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(DEFAULT_FORM)
  const [imageFile,  setImageFile]  = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const filtered = menu.filter(item => {
    const matchCat  = catFilter === 'All' || item.category === catFilter
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const resetImageSelection = (nextPreviewUrl = null) => {
    setImageFile(null)
    setPreviewUrl(nextPreviewUrl)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(DEFAULT_FORM)
    resetImageSelection(null)
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      foodCategory: item.category,
      price: String(item.price),
      emoji: item.emoji || MENU_CATEGORY_EMOJIS[item.category] || '🍴',
      description: item.description || '',
      isPreparedItem: item.isPreparedItem ?? true,
      imageUrl: item.imageUrl ?? null,
      maxPerOrder: item.maxPerOrder ?? null,
    })
    resetImageSelection(item.imageUrl ?? null)
    setFormErrors({})
    setShowModal(true)
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] ?? null
    const imageError = validateImageFile(file)

    if (imageError) {
      setImageFile(null)
      setPreviewUrl(form.imageUrl ?? null)
      setFormErrors(p => ({ ...p, image: imageError }))
      event.target.value = ''
      return
    }

    setFormErrors(p => {
      const next = { ...p }
      delete next.image
      return next
    })

    if (!file) {
      resetImageSelection(form.imageUrl ?? null)
      return
    }

    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    const errors = validateMenuItem(form)
    if (hasErrors(errors)) { setFormErrors(errors); return }
    setSaving(true)
    try {
      const imageUrl = imageFile ? await uploadMenuImage(imageFile) : form.imageUrl
      const payload = {
        ...form,
        price: parseFloat(form.price),
        isPreparedItem: form.isPreparedItem === true,
        imageUrl: imageUrl ?? null,
      }
      if (editing) {
        await updateItem(editing.id, payload)
        toast.success(`${form.name} updated!`)
      } else {
        const created = await menuService.create(payload)
        addItem(created)
        toast.success(`${form.name} added!`)
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.name}"? This cannot be undone.`)) return
    try {
      await removeItem(item.id)
      toast.success(`${item.name} removed`)
    } catch { toast.error('Failed to remove item') }
  }

  const handleToggle = async (item) => {
    try {
      await toggleItem(item.id)
      toast.success(`${item.name} ${item.available ? 'disabled' : 'enabled'}`)
    } catch { toast.error('Failed to update status') }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Manage Menu 🍴</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {menu.length} items · {menu.filter(i => i.available).length} available
          </p>
        </div>
        <Button icon="➕" onClick={openAdd}>Add Item</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
          <input
            className="input-field pl-10"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {MENU_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                catFilter === c
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {MENU_CATEGORY_LABELS[c] ?? c} {c !== 'All' && `(${menu.filter(i => i.category === c).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items',  value: menu.length,                          color: 'text-gray-900 dark:text-white' },
          { label: 'Available',    value: menu.filter(i => i.available).length,  color: 'text-brand-600 dark:text-brand-400' },
          { label: 'Unavailable',  value: menu.filter(i => !i.available).length, color: 'text-red-500' },
          { label: "Today's Top",  value: menu.sort((a,b)=>b.ordersToday-a.ordersToday)[0]?.name || '—', color: 'text-amber-500', small: true },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`font-bold text-lg leading-none ${s.color} ${s.small ? 'text-sm' : ''}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card p-4"><SkeletonTable rows={6} /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th><th>Category</th><th>Food Type</th><th>Price</th><th>Orders Today</th><th>Rating</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <motion.tr key={item.id} layout>
                    <td>
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                          />
                        ) : (
                          <span className="text-2xl">{item.emoji}</span>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-400 max-w-[180px] truncate">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-gray text-[10px]">{MENU_CATEGORY_EMOJIS[item.category]} {MENU_CATEGORY_LABELS[item.category] ?? item.category}</span></td>
                    <td>
                      <span className={`badge ${getFoodTypeMeta(item.isPreparedItem).className} text-[10px]`}>
                        {getFoodTypeMeta(item.isPreparedItem).label}
                      </span>
                    </td>
                    <td className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.price)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{item.ordersToday}</span>
                        {item.ordersToday > 30 && <span className="text-xs text-amber-500">🔥</span>}
                      </div>
                    </td>
                    <td>
                      {item.rating == null ? (
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">No ratings yet</span>
                      ) : (
                        <span className="text-amber-500 font-semibold">⭐ {item.rating}</span>
                      )}
                    </td>
                    <td>
                      <span className={item.available ? 'badge badge-green' : 'badge badge-red'}>
                        {item.available ? '✅ On' : '❌ Off'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors font-medium"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleToggle(item)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                            item.available
                              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500'
                              : 'bg-green-50 dark:bg-green-900/20 text-green-600'
                          }`}
                        >
                          {item.available ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors font-medium"
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
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🍽</p>
              <p className="text-sm">No items match your filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit: ${editing.name}` : 'Add New Item'}
        size="md"
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Item Name"
            className="col-span-2"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            error={formErrors.name}
            placeholder="e.g. Mushroom Risotto"
            autoFocus
          />
          <Input
            label="Price (₹)"
            type="number" min="0" step="0.01"
            value={form.price}
            onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
            error={formErrors.price}
            placeholder="9.99"
            icon="💵"
          />
          <Input
            label="Emoji"
            value={form.emoji}
            onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
            placeholder="🍄"
          />
          <div className="col-span-2">
            <label className="input-label">Item Image</label>
            <input
              className="input-field"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />
            {formErrors.image && (
              <p className="mt-1 text-xs font-medium text-red-500">{formErrors.image}</p>
            )}
            {previewUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt={`${form.name || 'Menu item'} preview`}
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {imageFile ? 'Selected image preview' : 'Current menu image'}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="input-label">Category</label>
            <select
              className="input-field"
              value={form.foodCategory ?? form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value, foodCategory: e.target.value, emoji: MENU_CATEGORY_EMOJIS[e.target.value] || '🍴' }))}
            >
              {MENU_CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{MENU_CATEGORY_EMOJIS[c]} {MENU_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Food Type</label>
            <select
              className="input-field"
              value={String(form.isPreparedItem ?? true)}
              onChange={e => setForm(p => ({ ...p, isPreparedItem: e.target.value === 'true' }))}
            >
              <option value="true">Cooked</option>
              <option value="false">Readymade</option>
            </select>
          </div>
          <Input
            label="Description"
            className="col-span-2"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Brief description…"
          />
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
