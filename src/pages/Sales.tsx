import { useState, useEffect } from 'react'
import { TrendingUp, Calendar, Package, DollarSign } from 'lucide-react'
import { db, type Sale } from '../db'

interface SaleWithDetails extends Sale {
  varietyName?: string
  productName?: string
  customerName?: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithDetails[]>([])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalQuantity: 0,
    cashRevenue: 0,
    creditRevenue: 0,
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

      // Fetch varieties and customers for context
      const allVarieties = await db.varieties.toArray()
      const allProducts = await db.products.toArray()
      const allCustomers = await db.customers.toArray()

      const varietyMap = new Map(allVarieties.map((v) => [v.id, v]))
      const productMap = new Map(allProducts.map((p) => [p.id, p]))
      const customerMap = new Map(allCustomers.map((c) => [c.id, c]))

      // Enrich sales with details
      const enrichedSales = filteredSales.map((sale) => {
        const variety = varietyMap.get(sale.varietyId)
        const product = variety ? productMap.get(variety.productId) : undefined
        const customer = sale.customerId ? customerMap.get(sale.customerId) : undefined

        return {
          ...sale,
          varietyName: variety?.flavorName || 'Unknown',
          productName: product?.name || 'Unknown',
          customerName: customer?.name || 'Walk-in',
        }
      })

      setSales(enrichedSales.reverse())

      // Calculate stats
      getStats(filteredSales, todaySales)
    } catch (error) {
      console.error('Error loading sales:', error)
    }
  }

  const getStats = async (filtered: Sale[], today: Sale[]) => {
    try {
      const cashRevenue = filtered
        .filter((s) => s.paymentStatus === 'cash')
        .reduce((sum, s) => sum + s.totalPrice, 0)

      const creditRevenue = filtered
        .filter((s) => s.paymentStatus === 'credit' || s.paymentStatus === 'partial')
        .reduce((sum, s) => sum + s.totalPrice, 0)

      setStats({
        totalSales: filtered.length,
        totalRevenue: filtered.reduce((sum, s) => sum + s.totalPrice, 0),
        totalQuantity: filtered.reduce((sum, s) => sum + s.quantity, 0),
        cashRevenue,
        creditRevenue,
        todayRevenue: today.reduce((sum, s) => sum + s.totalPrice, 0),
        todayQuantity: today.reduce((sum, s) => sum + s.quantity, 0),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales Report</h1>
          <p className="text-slate-600 mt-1">Track sales, revenue & payment breakdown</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Today's Summary */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">📅 Today's Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="card border-l-4 border-emerald-500">
              <p className="text-xs text-slate-600 font-medium">Today's Revenue</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                ₦{stats.todayRevenue.toLocaleString()}
              </p>
            </div>
            <div className="card border-l-4 border-emerald-400">
              <p className="text-xs text-slate-600 font-medium">Units Sold</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.todayQuantity}</p>
            </div>
            <div className="card border-l-4 border-slate-400 md:col-span-1 col-span-2 md:col-span-auto">
              <p className="text-xs text-slate-600 font-medium">Avg. Sale Value</p>
              <p className="text-2xl font-bold text-slate-700 mt-2">
                ₦{stats.todayQuantity > 0 ? Math.round(stats.todayRevenue / stats.todayQuantity).toLocaleString() : '0'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">
                    ₦{stats.totalRevenue.toLocaleString()}
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
                  <p className="text-3xl font-bold text-cyan-600 mt-2">{stats.totalSales}</p>
                </div>
                <div className="rounded-2xl bg-cyan-100 p-3">
                  <Package size={28} className="text-cyan-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div>
                <p className="text-sm text-slate-600 font-medium">Cash Sales</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ₦{stats.cashRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="card">
              <div>
                <p className="text-sm text-slate-600 font-medium">Credit Sales</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  ₦{stats.creditRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 card">
            <p className="text-sm text-slate-600 font-medium mb-2">Units Breakdown</p>
            <p className="text-3xl font-bold text-slate-900">{stats.totalQuantity}</p>
            <p className="text-xs text-slate-500 mt-2">Total units sold in last {filterDays} days</p>
          </div>
        </div>

        {/* Sales History */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">📋 Sales History</h2>
          {sales.length === 0 ? (
            <div className="card text-center py-12">
              <DollarSign className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-600 text-lg">No sales in this period.</p>
              <p className="text-slate-500 mt-2">Create products and start selling to see records here!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className={`card hover:shadow-md transition-all border-l-4 ${
                    sale.paymentStatus === 'cash'
                      ? 'border-emerald-500'
                      : 'border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Left Side - Item & Time */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-slate-100 p-2 flex-shrink-0">
                          <Package size={20} className="text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">
                            {sale.productName} - {sale.varietyName}
                          </p>
                          <p className="text-sm text-slate-600 mt-0.5">{sale.customerName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            {formatDate(sale.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Quantity, Price & Status */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            sale.paymentStatus === 'cash'
                              ? 'bg-emerald-100 text-emerald-700'
                              : sale.paymentStatus === 'partial'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {sale.paymentStatus === 'partial'
                            ? 'Partial'
                            : sale.paymentStatus === 'cash'
                              ? 'Cash'
                              : 'Credit'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">Qty: {sale.quantity}</p>
                      <p className="text-lg font-bold text-emerald-600 mt-1">
                        ₦{sale.totalPrice.toLocaleString()}
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
