import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Search, X, Phone, MapPin, Eye, BarChart3, PieChart } from 'lucide-react'
import { db, type Customer, type Sale, type Payment, type Variety, type Product } from '../db'

interface CustomerDetails {
  customer: Customer
  sales: Array<Sale & { varietyName?: string; productName?: string }>
  totalSpent: number
  creditOwed: number
  charType: 'bar' | 'pie'
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
  })
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')
  const [paymentForm, setPaymentForm] = useState({ amount: 0 })

  useEffect(() => {
    loadCustomers()
    const interval = setInterval(loadCustomers, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const filtered = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery) ||
        c.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredCustomers(filtered)
  }, [searchQuery, customers])

  const loadCustomers = async () => {
    try {
      const allCustomers = await db.customers.toArray()
      setCustomers(allCustomers)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadCustomerDetails = async (customerId: number) => {
    try {
      const customer = await db.customers.get(customerId)
      if (!customer) return

      const allSales = await db.sales.toArray()
      const allPayments = await db.payments.toArray()
      const varieties = await db.varieties.toArray()
      const products = await db.products.toArray()

      const varietyMap = new Map(varieties.map((v) => [v.id, v]))
      const productMap = new Map(products.map((p) => [p.id, p]))

      // Get customer's sales
      const customerSales = allSales.filter((s) => s.customerId === customerId)

      // Enrich sales with variety and product names
      const enrichedSales = customerSales.map((sale) => {
        const variety = varietyMap.get(sale.varietyId)
        const product = variety ? productMap.get(variety.productId) : null
        return {
          ...sale,
          varietyName: variety?.flavorName || 'Unknown',
          productName: product?.name || 'Unknown',
        }
      })

      // Calculate totals
      const totalSpent = enrichedSales.reduce((sum, s) => sum + s.totalPrice, 0)

      // Calculate credit owed
      const customerPayments = allPayments
        .filter((p) => p.customerId === customerId)
        .reduce((sum, p) => sum + p.amount, 0)

      let creditOwed = 0
      enrichedSales
        .filter((s) => s.paymentStatus === 'credit' || s.paymentStatus === 'partial')
        .forEach((s) => {
          const owed = s.totalPrice - (s.amountPaid + customerPayments)
          if (owed > 0) creditOwed += owed
        })

      setSelectedCustomer({
        customer,
        sales: enrichedSales.sort((a, b) => b.timestamp - a.timestamp),
        totalSpent,
        creditOwed,
        charType: chartType,
      })
      setPaymentForm({ amount: 0 })
    } catch (error) {
      console.error('Error loading customer details:', error)
    }
  }

  const handleOpenForm = () => {
    setFormData({ name: '', phone: '', address: '', email: '' })
    setEditingId(null)
    setFormOpen(true)
  }

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      email: customer.email || '',
    })
    setEditingId(customer.id || null)
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Customer name is required')
      return
    }

    try {
      if (editingId) {
        await db.customers.update(editingId, {
          ...formData,
          updatedAt: Date.now(),
        })
      } else {
        await db.customers.add({
          ...formData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      setFormOpen(false)
      loadCustomers()
    } catch (error) {
      console.error('Error saving customer:', error)
    }
  }

  const handleDelete = async (id: number | undefined) => {
    if (!id || !confirm('Delete this customer?')) return

    try {
      await db.customers.delete(id)
      loadCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedCustomer || paymentForm.amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      // Get the most recent credit sale for this customer
      const creditSales = selectedCustomer.sales.filter(
        (s) => s.paymentStatus === 'credit' || s.paymentStatus === 'partial'
      )

      if (creditSales.length === 0) {
        alert('No credit sales found for this customer')
        return
      }

      // Record payment against the most recent credit sale
      const latestCreditSale = creditSales[0]
      await db.payments.add({
        saleId: latestCreditSale.id!,
        customerId: selectedCustomer.customer.id!,
        amount: paymentForm.amount,
        timestamp: Date.now(),
      })

      // Reload details
      loadCustomerDetails(selectedCustomer.customer.id!)
      setPaymentForm({ amount: 0 })
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Error recording payment')
    }
  }

  // Calculate chart data from sales
  const getChartData = () => {
    if (!selectedCustomer) return []

    const productSales: Record<string, number> = {}
    selectedCustomer.sales.forEach((sale) => {
      const key = sale.productName
      productSales[key] = (productSales[key] || 0) + sale.totalPrice
    })

    return Object.entries(productSales).map(([name, total]) => ({
      name,
      value: total,
      percentage: (total / selectedCustomer.totalSpent) * 100,
    }))
  }

  const chartData = getChartData()
  const maxValue = Math.max(...chartData.map((d) => d.value), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-600 mt-1">Manage your regular customers</p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={handleOpenForm}
            className="button-primary flex items-center gap-2 px-4 py-3 rounded-2xl"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Total Customers</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{customers.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">This Month</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">
              {customers.filter((c) => {
                const created = c.createdAt || 0
                const now = Date.now()
                const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
                return created >= thirtyDaysAgo
              }).length}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Active</p>
            <p className="text-3xl font-bold text-cyan-600 mt-1">
              {customers.filter((c) => c.phone).length}
            </p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="p-4 md:p-6 space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-500 text-lg">No customers found. Add one to get started!</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-lg">{customer.name}</h3>

                  <div className="space-y-1 mt-2">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Phone size={16} className="text-emerald-600 flex-shrink-0" />
                        <a href={`tel:${customer.phone}`} className="hover:text-emerald-600">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-start gap-2 text-slate-600 text-sm">
                        <MapPin size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="text-slate-600 text-sm">
                        <a href={`mailto:${customer.email}`} className="hover:text-emerald-600">
                          {customer.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {customer.createdAt && (
                    <p className="text-xs text-slate-500 mt-2">
                      Added: {new Date(customer.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => loadCustomerDetails(customer.id!)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye size={18} className="text-emerald-600" />
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit customer"
                  >
                    <Edit2 size={18} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Delete customer"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.customer.name}</h2>
                <p className="text-slate-600 text-sm mt-1">Customer Profile & History</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card text-center">
                <p className="text-xs text-slate-600 font-medium">Total Spent</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ₦{selectedCustomer.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-slate-600 font-medium">Credit Owed</p>
                <p className={`text-2xl font-bold mt-1 ${selectedCustomer.creditOwed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ₦{selectedCustomer.creditOwed.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="card mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900">Purchase Distribution</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`p-2 rounded-lg transition-colors ${
                        chartType === 'bar' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <BarChart3 size={18} />
                    </button>
                    <button
                      onClick={() => setChartType('pie')}
                      className={`p-2 rounded-lg transition-colors ${
                        chartType === 'pie' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <PieChart size={18} />
                    </button>
                  </div>
                </div>

                {chartType === 'bar' ? (
                  <div className="space-y-3">
                    {chartData.map((item) => (
                      <div key={item.name}>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm font-semibold text-emerald-600">₦{item.value.toLocaleString()}</p>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all"
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{item.percentage.toFixed(1)}% of total</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-6">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {chartData.reduce(
                          (acc, item, idx) => {
                            const percentage = item.percentage
                            const cumulativeAngle = acc.angle
                            const sliceAngle = (percentage / 100) * 360
                            const startAngle = (cumulativeAngle * Math.PI) / 180
                            const endAngle = ((cumulativeAngle + sliceAngle) * Math.PI) / 180

                            const x1 = 50 + 40 * Math.cos(startAngle)
                            const y1 = 50 + 40 * Math.sin(startAngle)
                            const x2 = 50 + 40 * Math.cos(endAngle)
                            const y2 = 50 + 40 * Math.sin(endAngle)

                            const largeArc = sliceAngle > 180 ? 1 : 0
                            const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`

                            const colors = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                            const color = colors[idx % colors.length]

                            return {
                              paths: [
                                ...acc.paths,
                                <path key={idx} d={path} fill={color} stroke="white" strokeWidth="2" />,
                              ],
                              angle: cumulativeAngle + sliceAngle,
                            }
                          },
                          { paths: [] as JSX.Element[], angle: 0 }
                        ).paths}
                      </svg>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {chartData.map((item, idx) => {
                    const colors = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                        <span className="text-slate-600 truncate">{item.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Payment Update Form (if credit owed) */}
            {selectedCustomer.creditOwed > 0 && (
              <div className="card mb-6 border-l-4 border-orange-500">
                <h3 className="font-bold text-slate-900 mb-4">Record Payment</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Amount Owed: <span className="font-bold text-red-600">₦{selectedCustomer.creditOwed.toLocaleString()}</span>
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ amount: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => {
                      if (e.target.value === '0') {
                        e.target.value = ''
                      }
                    }}
                    placeholder="Amount paid"
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                    min="0"
                  />
                  <button
                    onClick={handleRecordPayment}
                    className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    Record
                  </button>
                </div>
              </div>
            )}

            {/* Purchase History */}
            <div className="card">
              <h3 className="font-bold text-slate-900 mb-4">Purchase History ({selectedCustomer.sales.length})</h3>
              {selectedCustomer.sales.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No purchases yet</p>
              ) : (
                <div className="space-y-3">
                  {selectedCustomer.sales.map((sale) => (
                    <div key={sale.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {sale.productName} - {sale.varietyName}
                          </p>
                          <p className="text-sm text-slate-600">Qty: {sale.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">₦{sale.totalPrice.toLocaleString()}</p>
                          <p
                            className={`text-xs font-semibold mt-1 ${
                              sale.paymentStatus === 'cash'
                                ? 'text-emerald-600'
                                : sale.paymentStatus === 'partial'
                                  ? 'text-orange-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {sale.paymentStatus === 'cash' ? '✓ Paid' : sale.paymentStatus === 'partial' ? '⊕ Partial' : '⊘ Credit'}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(sale.timestamp).toLocaleDateString()} {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 max-h-screen md:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., John, Mary"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., 08012345678"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., 3rd Floor, Main Street"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., john@example.com"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                />
              </div>

              <button type="submit" className="w-full button-primary py-3 rounded-xl font-medium">
                {editingId ? 'Update Customer' : 'Add Customer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
