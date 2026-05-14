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
  const [cart, setCart] = useState<Array<{ varietyId: number; quantity: number; price: number; productName: string; flavorName: string }>>([])
  const [checkoutForm, setCheckoutForm] = useState<{
    customerId: number | null
    paymentType: 'cash' | 'credit' | 'partial'
    amountPaid: number
  } | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [productOrder, setProductOrder] = useState<number[]>([])
  const [selectingMoreProducts, setSelectingMoreProducts] = useState(false)

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

  const handleAddToCart = (varietyId: number) => {
    const variety = varieties.find((v) => v.id === varietyId)
    if (!variety) return

    const existingItem = cart.find((item) => item.varietyId === varietyId)
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.varietyId === varietyId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          varietyId,
          quantity: 1,
          price: variety.price,
          productName: variety.productName || '',
          flavorName: variety.flavorName,
        },
      ])
    }
    setSelectedProduct(null)
  }

  const handleRemoveFromCart = (varietyId: number) => {
    setCart(cart.filter((item) => item.varietyId !== varietyId))
  }

  const handleUpdateCartQuantity = (varietyId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(varietyId)
    } else {
      const variety = varieties.find((v) => v.id === varietyId)
      if (variety && quantity <= variety.quantity) {
        setCart(
          cart.map((item) =>
            item.varietyId === varietyId ? { ...item, quantity } : item
          )
        )
      }
    }
  }

  const handleCheckout = async () => {
    if (!checkoutForm || cart.length === 0) return

    try {
      for (const item of cart) {
        const variety = varieties.find((v) => v.id === item.varietyId)
        if (!variety || item.quantity <= 0 || variety.quantity < item.quantity) {
          alert(`Invalid quantity for ${item.productName} - ${item.flavorName}`)
          return
        }

        const totalPrice = item.price * item.quantity

        // Update variety quantity
        await db.varieties.update(item.varietyId, {
          quantity: variety.quantity - item.quantity,
          updatedAt: Date.now(),
        })

        // Record sale
        await db.sales.add({
          varietyId: item.varietyId,
          customerId: checkoutForm.customerId || undefined,
          quantity: item.quantity,
          totalPrice,
          paymentStatus: checkoutForm.paymentType,
          amountPaid: checkoutForm.amountPaid,
          timestamp: Date.now(),
        })

        // If credit sale with partial payment
        if (
          checkoutForm.paymentType === 'partial' &&
          checkoutForm.customerId &&
          checkoutForm.amountPaid > 0
        ) {
          const sale = await db.sales.toArray()
          const lastSale = sale[sale.length - 1]
          if (lastSale.id) {
            await db.payments.add({
              saleId: lastSale.id,
              customerId: checkoutForm.customerId,
              amount: checkoutForm.amountPaid,
              timestamp: Date.now(),
            })
          }
        }
      }

      setCart([])
      setCheckoutForm(null)
      loadData()
    } catch (error) {
      console.error('Error recording sales:', error)
      alert('Error recording sales')
    }
  }

  const handleQuickSell = async () => {
    if (!checkoutForm || cart.length === 0) return
    await handleCheckout()
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

      if (checkoutForm) {
        setCheckoutForm({
          ...checkoutForm,
          customerId,
        })
      }
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

      {/* Product Selection Modal - Select Variety & Add to Cart */}
      {selectedProduct && (cart.length === 0 || selectingMoreProducts) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Select Flavor</h2>
              <button
                onClick={() => {
                  setSelectedProduct(null)
                  setSelectingMoreProducts(false)
                }}
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
                    handleAddToCart(variety.id!)
                    setSelectedProduct(null)
                    if (selectingMoreProducts) {
                      setSelectingMoreProducts(false)
                    }
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

      {/* Products Grid for Flavor Selection - When cart exists and adding more */}
      {!selectedProduct && cart.length > 0 && selectingMoreProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Select Product</h2>
              <button
                onClick={() => setSelectingMoreProducts(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {sortedProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                >
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-600 mt-1">{getProductVarieties(product.id!).length} flavors</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cart View - Show items and checkout */}
      {cart.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 max-h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Cart ({cart.length} items)</h2>
              <button
                onClick={() => {
                  setCart([])
                  setCheckoutForm(null)
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              {cart.map((item) => (
                <div key={item.varietyId} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{item.productName}</p>
                      <p className="text-sm text-slate-600">{item.flavorName}</p>
                      <p className="text-sm font-semibold text-emerald-600 mt-1">₦{item.price.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.varietyId)}
                      className="p-1 hover:bg-slate-200 rounded-lg"
                    >
                      <X size={18} className="text-red-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateCartQuantity(item.varietyId, item.quantity - 1)}
                      className="px-3 py-1 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateCartQuantity(item.varietyId, parseInt(e.target.value) || 0)}
                      className="w-12 text-center px-2 py-1 border border-slate-300 rounded-lg"
                      min="1"
                    />
                    <button
                      onClick={() => handleUpdateCartQuantity(item.varietyId, item.quantity + 1)}
                      className="px-3 py-1 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      +
                    </button>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-slate-900">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Products Button */}
            {!selectingMoreProducts && (
              <button
                onClick={() => setSelectingMoreProducts(true)}
                className="w-full mb-4 py-3 border-2 border-emerald-500 text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition-colors"
              >
                + Add Another Product
              </button>
            )}

            {/* Checkout Section */}
            {!checkoutForm ? (
              <button
                onClick={() =>
                  setCheckoutForm({
                    customerId: null,
                    paymentType: 'cash',
                    amountPaid: 0,
                  })
                }
                className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Proceed to Checkout
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCheckout()
                }}
                className="space-y-4"
              >
                {/* Cart Summary */}
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-sm text-slate-600">Subtotal</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    ₦{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString()}
                  </p>
                </div>

                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer (Optional)</label>
                  <div className="space-y-2">
                    <select
                      value={checkoutForm.customerId || ''}
                      onChange={(e) => {
                        if (e.target.value === 'new') {
                          setShowNewCustomer(true)
                        } else {
                          setCheckoutForm({
                            ...checkoutForm,
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
                    value={checkoutForm.paymentType}
                    onChange={(e) =>
                      setCheckoutForm({
                        ...checkoutForm,
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

                {/* Amount Paid */}
                {checkoutForm.paymentType !== 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Amount Paid</label>
                    <input
                      type="number"
                      value={checkoutForm.amountPaid}
                      onChange={(e) => {
                        const value = e.target.value
                        setCheckoutForm({
                          ...checkoutForm,
                          amountPaid: value === '' ? 0 : parseFloat(value) || 0,
                        })
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

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutForm(null)}
                    className="flex-1 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Back to Cart
                  </button>
                  <button type="submit" className="flex-1 button-primary py-3 rounded-xl font-semibold">
                    Complete Sale
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
