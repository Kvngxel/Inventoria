import { useEffect, useState } from 'react'
import { ShoppingCart, AlertCircle, TrendingUp, Package, Users, DollarSign, X, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { db, type Variety, type Product, type Customer } from '../db'

interface DashboardStats {
  totalProducts: number
  totalVarieties: number
  totalValue: number
  lowStockVarieties: number
  totalCustomers: number
  totalCreditOwed: number
}

interface VarietyWithProduct extends Variety {
  productName?: string
}

interface ProductWithVarieties extends Product {
  varieties: Variety[]
  totalStock: number
  lowStockCount: number
}

export default function Dashboard() {
  const [varieties, setVarieties] = useState<VarietyWithProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalVarieties: 0,
    totalValue: 0,
    lowStockVarieties: 0,
    totalCustomers: 0,
    totalCreditOwed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quickSellForm, setQuickSellForm] = useState<{
    varietyId: number | null
    quantity: number
    customerId: number | null
    paymentType: 'cash' | 'credit' | 'partial'
    amountPaid: number
  } | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [productOrder, setProductOrder] = useState<number[]>([])

  // Load data on mount
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 500)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const allVarieties = await db.varieties.toArray()
      const allProducts = await db.products.toArray()
      const allCustomers = await db.customers.toArray()
      const allSales = await db.sales.toArray()
      const allPayments = await db.payments.toArray()

      const productMap = new Map(allProducts.map((p) => [p.id, p]))

      // Enrich varieties with product names
      const enrichedVarieties = allVarieties.map((v) => ({
        ...v,
        productName: productMap.get(v.productId)?.name,
      }))

      setVarieties(enrichedVarieties)
      setProducts(allProducts)
      setCustomers(allCustomers)

      // Initialize product order if not set
      if (productOrder.length === 0 && allProducts.length > 0) {
        setProductOrder(allProducts.map((p) => p.id!).sort((a, b) => a - b))
      }

      // Calculate stats
      const totalValue = allVarieties.reduce((sum, v) => sum + v.price * v.quantity, 0)
      const lowStockVarieties = allVarieties.filter((v) => v.quantity <= v.minStockLevel).length

      // Calculate total credit owed
      const paymentsByCustomer = new Map<number, number>()
      allPayments.forEach((p) => {
        paymentsByCustomer.set(p.customerId, (paymentsByCustomer.get(p.customerId) || 0) + p.amount)
      })

      let totalCreditOwed = 0
      allSales
        .filter((s) => s.paymentStatus === 'credit' || s.paymentStatus === 'partial')
        .forEach((s) => {
          if (s.customerId) {
            const paid = paymentsByCustomer.get(s.customerId) || 0
            const owed = s.totalPrice - (s.amountPaid + paid)
            if (owed > 0) totalCreditOwed += owed
          }
        })

      setStats({
        totalProducts: allProducts.length,
        totalVarieties: allVarieties.length,
        totalValue,
        lowStockVarieties,
        totalCustomers: allCustomers.length,
        totalCreditOwed,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSell = async () => {
    if (!quickSellForm || !quickSellForm.varietyId) return

    const variety = varieties.find((v) => v.id === quickSellForm.varietyId)
    if (!variety || quickSellForm.quantity <= 0 || variety.quantity < quickSellForm.quantity) {
      alert('Invalid quantity or insufficient stock')
      return
    }

    try {
      const totalPrice = variety.price * quickSellForm.quantity

      // Update variety quantity
      await db.varieties.update(quickSellForm.varietyId, {
        quantity: variety.quantity - quickSellForm.quantity,
        updatedAt: Date.now(),
      })

      // Record sale
      await db.sales.add({
        varietyId: quickSellForm.varietyId,
        customerId: quickSellForm.customerId || undefined,
        quantity: quickSellForm.quantity,
        totalPrice,
        paymentStatus: quickSellForm.paymentType,
        amountPaid: quickSellForm.amountPaid,
        timestamp: Date.now(),
      })

      // If credit sale, record initial payment if partial
      if (
        quickSellForm.paymentType === 'partial' &&
        quickSellForm.customerId &&
        quickSellForm.amountPaid > 0
      ) {
        const sale = await db.sales.toArray()
        const lastSale = sale[sale.length - 1]
        if (lastSale.id) {
          await db.payments.add({
            saleId: lastSale.id,
            customerId: quickSellForm.customerId,
            amount: quickSellForm.amountPaid,
            timestamp: Date.now(),
          })
        }
      }

      setQuickSellForm(null)
      setSelectedProduct(null)
      loadData()
    } catch (error) {
      console.error('Error recording sale:', error)
      alert('Error recording sale')
    }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('Please enter a customer name')
      return
    }

    try {
      const customerId = await db.customers.add({
        name: newCustomerName,
        phone: '',
        address: '',
        email: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      setQuickSellForm((prev) =>
        prev ? { ...prev, customerId } : null
      )
      setNewCustomerName('')
      setShowNewCustomer(false)
      loadData()
    } catch (error) {
      console.error('Error creating customer:', error)
      alert('Error creating customer')
    }
  }

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...productOrder]
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    }
    setProductOrder(newOrder)
  }

  const getProductVarieties = (productId: number) => {
    return varieties.filter((v) => v.productId === productId)
  }

  const getProductTotalValue = (productId: number) => {
    return getProductVarieties(productId).reduce((sum, v) => sum + v.price * v.quantity, 0)
  }

  const getLowStockCount = (productId: number) => {
    return getProductVarieties(productId).filter((v) => v.quantity <= v.minStockLevel).length
  }

  const isLowStock = (variety: Variety) => variety.quantity <= variety.minStockLevel

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-500" />
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const sortedProducts = productOrder
    .map((id) => products.find((p) => p.id === id))
    .filter((p) => p !== undefined) as Product[]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Overview & quick actions</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">Products</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProducts}</p>
              </div>
              <Package className="text-emerald-600" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">Varieties</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalVarieties}</p>
              </div>
              <ShoppingCart className="text-cyan-600" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ₦{(stats.totalValue / 1000000).toFixed(1)}M
                </p>
              </div>
              <TrendingUp className="text-emerald-600" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">Customers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCustomers}</p>
              </div>
              <Users className="text-cyan-600" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">Low Stock</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.lowStockVarieties}</p>
              </div>
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">Credit Owed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  ₦{(stats.totalCreditOwed / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSign className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        {/* Quick Sell Section */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">🛒 Quick Sell</h2>
          {sortedProducts.length === 0 ? (
            <div className="card text-center py-12">
              <Package className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-600">No products available yet.</p>
              <p className="text-sm text-slate-500 mt-1">Create products and varieties to start selling.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedProducts.map((product, index) => {
                const productVarieties = getProductVarieties(product.id!)
                const lowStockCount = getLowStockCount(product.id!)

                return (
                  <div
                    key={product.id}
                    className={`card cursor-pointer transition-all hover:shadow-lg ${
                      lowStockCount > 0 ? 'border-l-4 border-red-500' : ''
                    }`}
                  >
                    {lowStockCount > 0 && (
                      <div className="flex items-center gap-2 mb-3 p-2 bg-red-100 rounded-lg">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-xs font-semibold text-red-700">{lowStockCount} Low Stock</span>
                      </div>
                    )}

                    <h3 className="font-semibold text-slate-900 text-lg">{product.name}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{product.description || 'No description'}</p>

                    <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-600">{productVarieties.length} Flavors</p>
                          <p className="text-lg font-bold text-slate-900 mt-1">
                            {productVarieties.reduce((sum, v) => sum + v.quantity, 0)} units
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-600">Value</p>
                          <p className="text-sm font-bold text-emerald-600 mt-1">
                            ₦{(getProductTotalValue(product.id!) / 1000).toLocaleString()}K
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="w-full mt-3 button-primary py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      Sell Now
                    </button>

                    {/* Reorder Buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => moveProduct(index, 'up')}
                        disabled={index === 0}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveProduct(index, 'down')}
                        disabled={index === sortedProducts.length - 1}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Selection Modal - Select Variety & Customer */}
      {selectedProduct && !quickSellForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Select Flavor</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {getProductVarieties(selectedProduct.id!).map((variety) => (
                <button
                  key={variety.id}
                  onClick={() => {
                    setQuickSellForm({
                      varietyId: variety.id!,
                      quantity: 1,
                      customerId: null,
                      paymentType: 'cash',
                      amountPaid: 0,
                    })
                  }}
                  className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{variety.flavorName}</p>
                      <p className="text-sm text-slate-600 mt-1">₦{variety.price.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{variety.quantity} units</p>
                      {isLowStock(variety) && (
                        <p className="text-xs text-red-600 font-bold mt-1">LOW STOCK</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Sell Form Modal */}
      {quickSellForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 max-h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Complete Sale</h2>
              <button
                onClick={() => {
                  setQuickSellForm(null)
                  setSelectedProduct(null)
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleQuickSell()
              }}
              className="space-y-4"
            >
              {/* Product Info Display */}
              {varieties.find((v) => v.id === quickSellForm.varietyId) && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-sm font-semibold text-slate-600">
                    {varieties.find((v) => v.id === quickSellForm.varietyId)?.productName}
                  </p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {varieties.find((v) => v.id === quickSellForm.varietyId)?.flavorName}
                  </p>
                  <p className="text-sm text-emerald-700 font-semibold mt-2">
                    ₦{varieties.find((v) => v.id === quickSellForm.varietyId)?.price.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
                <input
                  type="number"
                  value={quickSellForm.quantity}
                  onChange={(e) => {
                    const value = e.target.value
                    setQuickSellForm({ ...quickSellForm, quantity: value === '' ? 0 : parseInt(value) || 0 })
                  }}
                  onFocus={(e) => {
                    if (e.target.value === '0') {
                      e.target.value = ''
                      e.target.select()
                    } else {
                      e.target.select()
                    }
                  }}
                  min="1"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                />
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer (Optional)</label>
                <div className="space-y-2">
                  <select
                    value={quickSellForm.customerId || ''}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowNewCustomer(true)
                      } else {
                        setQuickSellForm({
                          ...quickSellForm,
                          customerId: e.target.value ? parseInt(e.target.value) : null,
                        })
                        setShowNewCustomer(false)
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="new">+ Add New Member</option>
                  </select>

                  {showNewCustomer && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <input
                        type="text"
                        placeholder="Member name..."
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateCustomer}
                          className="flex-1 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-semibold text-sm hover:bg-emerald-200 transition-colors"
                        >
                          <Plus size={14} className="inline mr-1" />
                          Create
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCustomer(false)
                            setNewCustomerName('')
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Type *</label>
                <select
                  value={quickSellForm.paymentType}
                  onChange={(e) =>
                    setQuickSellForm({
                      ...quickSellForm,
                      paymentType: e.target.value as 'cash' | 'credit' | 'partial',
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="partial">Partial Payment</option>
                  <option value="credit">Full Credit</option>
                </select>
              </div>

              {/* Amount Paid (if partial or credit) */}
              {quickSellForm.paymentType !== 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount Paid</label>
                  <input
                    type="number"
                    value={quickSellForm.amountPaid}
                    onChange={(e) => {
                      const value = e.target.value
                      setQuickSellForm({ ...quickSellForm, amountPaid: value === '' ? 0 : parseFloat(value) || 0 })
                    }}
                    onFocus={(e) => {
                      if (e.target.value === '0') {
                        e.target.value = ''
                        e.target.select()
                      } else {
                        e.target.select()
                      }
                    }}
                    min="0"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  />
                </div>
              )}

              {/* Total */}
              {varieties.find((v) => v.id === quickSellForm.varietyId) && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-sm text-slate-600">Total Amount</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    ₦
                    {(
                      (varieties.find((v) => v.id === quickSellForm.varietyId)?.price || 0) *
                      quickSellForm.quantity
                    ).toLocaleString()}
                  </p>
                </div>
              )}

              <button type="submit" className="w-full button-primary py-3 rounded-xl font-semibold">
                Complete Sale
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
