import { useEffect, useState } from 'react'
import { ShoppingCart, AlertCircle, TrendingUp } from 'lucide-react'
import { db, type InventoryItem } from '../db'

interface DashboardStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
}

export default function Dashboard() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
  })
  const [loading, setLoading] = useState(true)

  // Load inventory on mount
  useEffect(() => {
    loadInventory()
    // Set up real-time listener
    const interval = setInterval(loadInventory, 500)
    return () => clearInterval(interval)
  }, [])

  const loadInventory = async () => {
    try {
      const allItems = await db.inventory.toArray()
      setItems(allItems)

      // Calculate stats
      const totalValue = allItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const lowStockItems = allItems.filter((item) => item.quantity <= item.minStockLevel).length

      setStats({
        totalItems: allItems.length,
        totalValue,
        lowStockItems,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSell = async (item: InventoryItem) => {
    if (!item.id || item.quantity <= 0) return

    try {
      // Update item quantity instantly (zero-load logic)
      const newQuantity = item.quantity - 1
      await db.inventory.update(item.id, { quantity: newQuantity })

      // Record the sale
      await db.sales.add({
        inventoryId: item.id,
        quantity: 1,
        totalPrice: item.price,
        timestamp: Date.now(),
      })

      // Trigger UI update
      loadInventory()
    } catch (error) {
      console.error('Error selling item:', error)
    }
  }

  const isLowStock = (item: InventoryItem) => item.quantity <= item.minStockLevel

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-500" />
          <p className="mt-4 text-slate-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Quick overview and bulk actions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Items */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Items</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalItems}</p>
            </div>
            <div className="rounded-2xl bg-electric-100 p-3">
              <ShoppingCart size={28} className="text-electric-600" />
            </div>
          </div>
        </div>

        {/* Total Value */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Value</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                ${stats.totalValue.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3">
              <TrendingUp size={28} className="text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Low Stock</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.lowStockItems}</p>
            </div>
            <div className="rounded-2xl bg-red-100 p-3">
              <AlertCircle size={28} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Sell</h2>
        {items.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600">No items in inventory yet.</p>
            <p className="text-sm text-slate-500 mt-2">Go to Inventory to add items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className={`card card-hover ${isLowStock(item) ? 'border-red-300 bg-red-50' : ''}`}>
                {/* Stock Warning */}
                {isLowStock(item) && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-red-100 rounded-lg">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-red-700">Low Stock!</span>
                  </div>
                )}

                {/* Item Details */}
                <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{item.category}</p>

                {/* Quantity & Price */}
                <div className="flex items-center justify-between mt-4 p-3 bg-slate-100 rounded-xl">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Stock: {item.quantity}</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 font-medium">Min: {item.minStockLevel}</p>
                    <p className="text-sm font-semibold text-emerald-600 mt-1">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Quick Sell Button - Thumb-Friendly & Bold */}
                <button
                  onClick={() => handleQuickSell(item)}
                  disabled={item.quantity <= 0}
                  className="w-full btn-primary mt-4 flex items-center justify-center gap-2 py-4 text-lg font-bold"
                >
                  <ShoppingCart size={22} />
                  Quick Sell
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
