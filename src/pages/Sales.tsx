import { useState, useEffect } from 'react'
import { TrendingUp, Calendar, Package } from 'lucide-react'
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
    todayRevenue: 0,
    todayQuantity: 0,
  })
  const [filterDays, setFilterDays] = useState(7)

  useEffect(() => {
    loadSales()
    const interval = setInterval(loadSales, 1000)
    return () => clearInterval(interval)
  }, [filterDays])

  const loadSales = async () => {
    try {
      const allSales = await db.sales.toArray()
      const now = Date.now()
      const cutoff = now - filterDays * 24 * 60 * 60 * 1000
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // Filter by date range
      const filteredSales = allSales.filter((sale) => sale.timestamp >= cutoff)
      const todaySales = allSales.filter((sale) => sale.timestamp >= todayStart.getTime())

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
      getStats()
    } catch (error) {
      console.error('Error loading sales:', error)
    }
  }

  const getStats = async () => {
    try {
      const allSales = await db.sales.toArray()
      const now = Date.now()
      const cutoff = now - filterDays * 24 * 60 * 60 * 1000
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const filteredSales = allSales.filter((sale) => sale.timestamp >= cutoff)
      const todaySales = allSales.filter((sale) => sale.timestamp >= todayStart.getTime())

      setStats({
        totalSales: filteredSales.length,
        totalRevenue: filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0),
        totalQuantity: filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
        todayRevenue: todaySales.reduce((sum, sale) => sum + sale.totalPrice, 0),
        todayQuantity: todaySales.reduce((sum, sale) => sum + sale.quantity, 0),
      })
    } catch (error) {
      console.error('Error calculating stats:', error)
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales Ledger</h1>
          <p className="text-slate-600 mt-1">Track your sales activity</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Today's Summary */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">📅 Today's Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="card border-l-4 border-electric-500">
              <p className="text-xs text-slate-600 font-medium">Today's Revenue</p>
              <p className="text-2xl font-bold text-electric-600 mt-2">
                ${stats.todayRevenue.toFixed(2)}
              </p>
            </div>
            <div className="card border-l-4 border-emerald-500">
              <p className="text-xs text-slate-600 font-medium">Units Sold</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.todayQuantity}</p>
            </div>
            <div className="card border-l-4 border-slate-400 md:col-span-1 col-span-2 md:col-span-auto">
              <p className="text-xs text-slate-600 font-medium">Avg. Sale Value</p>
              <p className="text-2xl font-bold text-slate-700 mt-2">
                ${stats.todayQuantity > 0 ? (stats.todayRevenue / stats.todayQuantity).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Period Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">📊 Period Summary</h2>
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setFilterDays(days)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                    filterDays === days
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3">
                  <TrendingUp size={28} className="text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Transactions</p>
                  <p className="text-3xl font-bold text-electric-600 mt-2">{stats.totalSales}</p>
                </div>
                <div className="rounded-2xl bg-electric-100 p-3">
                  <Package size={28} className="text-electric-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Units Sold</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalQuantity}</p>
                <p className="text-xs text-slate-500 mt-2">Last {filterDays} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales History */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">📋 Sales History</h2>
          {sales.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-600 text-lg">No sales in this period.</p>
              <p className="text-slate-500 mt-2">Go to Dashboard to make your first sale!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="card hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Left Side - Item & Time */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-slate-100 p-2 flex-shrink-0">
                          <Package size={20} className="text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{sale.itemName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            {formatDate(sale.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Quantity & Price */}
                    <div className="text-right">
                      <p className="text-sm text-slate-600 font-medium">Qty: {sale.quantity}</p>
                      <p className="text-lg font-bold text-emerald-600 mt-1">
                        ${sale.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
