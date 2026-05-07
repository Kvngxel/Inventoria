import { useState, useEffect } from 'react'
import { BarChart3, Calendar } from 'lucide-react'
import { db, type Sale, type InventoryItem } from '../db'

interface SaleWithItem extends Sale {
  itemName?: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithItem[]>([])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalQuantity: 0,
  })
  const [filterDays, setFilterDays] = useState(7)

  useEffect(() => {
    loadSales()
  }, [filterDays])

  const loadSales = async () => {
    try {
      const allSales = await db.sales.toArray()
      const now = Date.now()
      const cutoff = now - filterDays * 24 * 60 * 60 * 1000

      // Filter by date range
      const filteredSales = allSales.filter((sale) => sale.timestamp >= cutoff)

      // Fetch inventory items for context
      const allItems = await db.inventory.toArray()
      const itemMap = new Map(allItems.map((item) => [item.id, item]))

      // Enrich sales with item names
      const enrichedSales = filteredSales.map((sale) => ({
        ...sale,
        itemName: itemMap.get(sale.inventoryId)?.name || 'Unknown Item',
      }))

      setSales(enrichedSales.reverse())

      // Calculate stats
      setStats({
        totalSales: enrichedSales.length,
        totalRevenue: enrichedSales.reduce((sum, sale) => sum + sale.totalPrice, 0),
        totalQuantity: enrichedSales.reduce((sum, sale) => sum + sale.quantity, 0),
      })
    } catch (error) {
      console.error('Error loading sales:', error)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Sales</h1>
        <p className="text-slate-600 mt-2">Track your sales activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Sales */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Sales</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalSales}</p>
            </div>
            <div className="rounded-2xl bg-electric-100 p-3">
              <BarChart3 size={28} className="text-electric-600" />
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="card">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Revenue</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-2">Last {filterDays} days</p>
          </div>
        </div>

        {/* Total Quantity */}
        <div className="card">
          <div>
            <p className="text-sm font-medium text-slate-600">Items Sold</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalQuantity}</p>
            <p className="text-xs text-slate-500 mt-2">Last {filterDays} days</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setFilterDays(days)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filterDays === days
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Sales List */}
      <div>
        {sales.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600">No sales in this period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="card">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{sale.itemName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar size={14} />
                      {formatDate(sale.timestamp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Qty: {sale.quantity}</p>
                    <p className="text-lg font-bold text-emerald-600">${sale.totalPrice.toFixed(2)}</p>
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
