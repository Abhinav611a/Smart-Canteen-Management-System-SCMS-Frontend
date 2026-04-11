import { useState, useEffect, useCallback } from 'react'
import { menuService } from '@/services/menu'

/**
 * useMenu — fetches and manages the menu item list.
 * FIX BUG 15: old hook stored the Page<T> object in state; pages called
 * menu.filter() on it → TypeError. menuService.getAll() now returns a
 * flat normalised array — this hook just stores/manages that array.
 */
export function useMenu() {
  const [menu,    setMenu]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchMenu = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await menuService.getAll()
      // data is already a flat array (Page unwrapped inside menuService)
      setMenu(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setMenu([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  const toggleItem = useCallback(async (id) => {
    const updated = await menuService.toggleAvailability(id)
    setMenu(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m))
  }, [])

  const addItem = useCallback((item) => {
    setMenu(prev => [...prev, item])
  }, [])

  const removeItem = useCallback(async (id) => {
    await menuService.delete(id)
    setMenu(prev => prev.filter(m => m.id !== id))
  }, [])

  const updateItem = useCallback(async (id, data) => {
    const updated = await menuService.update(id, data)
    setMenu(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m))
    return updated
  }, [])

  return { menu, loading, error, refetch: fetchMenu, toggleItem, addItem, removeItem, updateItem }
}
