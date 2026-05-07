import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Search, X } from 'lucide-react'
import { db, type InventoryItem } from '../db'

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    category: '',
    quantity: 0,
    price: 0,
    minStockLevel: 0,
  })

  useEffect(() => {
    loadItems()
    const interval = setInterval(loadItems, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const filtered = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredItems(filtered)
  }, [searchQuery, items])

  const loadItems = async () => {
    try {
      const allItems = await db.inventory.toArray()
      setItems(allItems)
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.category) {
      alert('Name and category are required')
      return
    }

    try {
      if (editingId) {
        await db.inventory.update(editingId, {
          ...formData,
          updatedAt: Date.now(),
        })
      } else {
        await db.inventory.add({
          ...formData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      resetForm()
      loadItems()
    } catch (error) {
      console.error('Error saving item:', error)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
      minStockLevel: item.minStockLevel,
    })
    setEditingId(item.id || null)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number | undefined) => {
    if (!id || !confirm('Delete this item?')) return

    try {
      await db.inventory.delete(id)
      loadItems()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const resetForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormData({
      name: '',
      category: '',
      quantity: 0,
      price: 0,
      minStockLevel: 0,
    })
  }

  const isLowStock = (item: InventoryItem) => item.quantity <= item.minStockLevel

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-600 mt-1">Manage your stock</p>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="p-4 md:p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Total Items</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Total Value</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              ${items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(0)}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Low Stock</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {items.filter(isLowStock).length}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Categories</p>
            <p className="text-2xl font-bold text-electric-600 mt-1">
              {new Set(items.map(i => i.category)).size}
            </p>
          </div>
        </div>
      </div>

      {/* Add Item Panel - Sliding Modal */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          formOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) resetForm()
        }}
      >
        <div className="absolute inset-0 bg-black/30" />

        {/* Sliding Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 overflow-y-auto ${
            formOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:p-6 bg-gradient-to-r from-emerald-50 to-electric-50 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? '✏️ Edit Item' : '➕ Add Item'}
            </h2>
            <button
              onClick={resetForm}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X size={24} className="text-slate-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Yogurt, Milk"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                required
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Category *
              </label>
              <input
                type="text"
                placeholder="e.g., Provisions, Yogurts"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                required
                list="categories"
              />
              <datalist id="categories">
                {Array.from(new Set(items.map(i => i.category)))
                  .filter(cat => cat)
                  .map(cat => (
                    <option key={cat} value={cat} />
                  ))}
              </datalist>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Quantity
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                min="0"
              />
            </div>

            {/* Price per Unit */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Price per Unit
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                step="0.01"
                min="0"
              />
            </div>

            {/* Min Stock Level */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Minimum Stock Level
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.minStockLevel}
                onChange={(e) =>
                  setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                You'll get notified when stock drops below this level
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 btn-primary py-4 font-semibold flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                {editingId ? 'Update Item' : 'Add Item'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 btn-secondary py-4 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Items List */}
      <div className="px-4 md:p-6">
        {filteredItems.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600 text-lg">
              {items.length === 0 ? 'No items yet.' : 'No matches found.'}
            </p>
            <p className="text-slate-500 mt-2">
              {items.length === 0 ? 'Click the button below to add one!' : 'Try a different search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`card card-hover ${
                  isLowStock(item) ? 'border-red-300 bg-gradient-to-br from-white to-red-50' : ''
                }`}
              >
                {/* Stock Warning Badge */}
                {isLowStock(item) && (
                  <div className="mb-3 inline-flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full">
                    <span className="text-xs font-bold text-red-700">⚠️ LOW STOCK</span>
                  </div>
                )}

                {/* Item Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-600 font-medium">{item.category}</p>
                  </div>
                </div>

                {/* Item Details Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl mb-3">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Stock</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Unit Price</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">${item.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Min Stock</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{item.minStockLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Total Value</p>
                    <p className="text-sm font-bold text-electric-600 mt-1">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-electric-100 text-electric-700 font-semibold hover:bg-electric-200 transition-colors"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => {
          resetForm()
          setFormOpen(true)
        }}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-2xl hover:shadow-3xl hover:scale-110 transition-all active:scale-95 flex items-center justify-center z-40"
        title="Add Item"
      >
        <Plus size={32} strokeWidth={3} />
      </button>
    </div>
  )
}
