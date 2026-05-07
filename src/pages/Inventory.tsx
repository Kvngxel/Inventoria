import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { db, type InventoryItem } from '../db'

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
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
  }, [])

  const loadItems = async () => {
    const allItems = await db.inventory.toArray()
    setItems(allItems)
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

      setFormOpen(false)
      setEditingId(null)
      setFormData({
        name: '',
        category: '',
        quantity: 0,
        price: 0,
        minStockLevel: 0,
      })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-600 mt-2">Manage your stock</p>
        </div>
        <button
          onClick={() => {
            setFormOpen(!formOpen)
            setEditingId(null)
            setFormData({
              name: '',
              category: '',
              quantity: 0,
              price: 0,
              minStockLevel: 0,
            })
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Form */}
      {formOpen && (
        <div className="card mb-8 bg-emerald-50 border-emerald-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {editingId ? 'Edit Item' : 'Add New Item'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:outline-none"
                required
              />
              <input
                type="number"
                placeholder="Quantity"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:outline-none"
                min="0"
              />
              <input
                type="number"
                placeholder="Price per Unit"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:outline-none"
                step="0.01"
                min="0"
              />
              <input
                type="number"
                placeholder="Min Stock Level"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                className="px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:outline-none"
                min="0"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1">
                {editingId ? 'Update Item' : 'Add Item'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false)
                  setEditingId(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      <div>
        {items.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600">No items yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-600">{item.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-100 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Quantity:</span>
                    <span className="font-semibold text-slate-900">{item.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Price:</span>
                    <span className="font-semibold text-slate-900">${item.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Min Stock:</span>
                    <span className="font-semibold text-slate-900">{item.minStockLevel}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-300">
                    <span className="text-sm text-slate-600">Total Value:</span>
                    <span className="font-bold text-emerald-600">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
