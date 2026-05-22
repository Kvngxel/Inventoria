import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { db, type Product, type Variety } from '../db'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [varieties, setVarieties] = useState<Variety[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)

  // Product form state
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [productFormData, setProductFormData] = useState({ name: '', description: '' })
  const [newVarieties, setNewVarieties] = useState<Array<{ flavorName: string; price: number; quantity: number; minStockLevel: number }>>([])

  // Variety form state
  const [varietyFormOpen, setVarietyFormOpen] = useState(false)
  const [editingVarietyId, setEditingVarietyId] = useState<number | null>(null)
  const [currentProductId, setCurrentProductId] = useState<number | null>(null)
  const [varietyFormData, setVarietyFormData] = useState({
    flavorName: '',
    price: 0,
    quantity: 0,
    minStockLevel: 0,
  })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const filtered = products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredProducts(filtered)
  }, [searchQuery, products])

  const loadData = async () => {
    try {
      const allProducts = await db.products.toArray()
      const allVarieties = await db.varieties.toArray()
      setProducts(allProducts)
      setVarieties(allVarieties)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  // ============ PRODUCT OPERATIONS ============
  const handleAddProduct = () => {
    setProductFormData({ name: '', description: '' })
    setEditingProductId(null)
    // initialize with one empty variety row for quick creation
    setNewVarieties([{ flavorName: '', price: 0, quantity: 0, minStockLevel: 0 }])
    setProductFormOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setProductFormData({ name: product.name, description: product.description || '' })
    setEditingProductId(product.id || null)
    setProductFormOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productFormData.name.trim()) {
      alert('Product name is required')
      return
    }

    try {
      if (editingProductId) {
        await db.products.update(editingProductId, {
          ...productFormData,
          updatedAt: Date.now(),
        })
      } else {
        // create product then create any varieties provided in the form
        const productId = await db.products.add({
          ...productFormData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        if (newVarieties && newVarieties.length > 0) {
          for (const v of newVarieties) {
            if (!v.flavorName.trim()) continue
            await db.varieties.add({
              flavorName: v.flavorName,
              price: v.price,
              quantity: v.quantity,
              minStockLevel: v.minStockLevel,
              productId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
          }
        }
        setNewVarieties([])
      }
      setProductFormOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDeleteProduct = async (id: number | undefined) => {
    if (!id || !confirm('Delete this product and all its varieties?')) return
    try {
      await db.products.delete(id)
      const varietiesToDelete = varieties.filter((v) => v.productId === id)
      await Promise.all(varietiesToDelete.map((v) => v.id && db.varieties.delete(v.id)))
      loadData()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  // ============ VARIETY OPERATIONS ============
  const handleAddVariety = (productId: number) => {
    setCurrentProductId(productId)
    setVarietyFormData({
      flavorName: '',
      price: 0,
      quantity: 0,
      minStockLevel: 0,
    })
    setEditingVarietyId(null)
    setVarietyFormOpen(true)
  }

  const handleEditVariety = (variety: Variety) => {
    setCurrentProductId(variety.productId)
    setVarietyFormData({
      flavorName: variety.flavorName,
      price: variety.price,
      quantity: variety.quantity,
      minStockLevel: variety.minStockLevel,
    })
    setEditingVarietyId(variety.id || null)
    setVarietyFormOpen(true)
  }

  const handleSaveVariety = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!varietyFormData.flavorName.trim() || !currentProductId) {
      alert('Flavor name and product are required')
      return
    }

    try {
      if (editingVarietyId) {
        await db.varieties.update(editingVarietyId, {
          ...varietyFormData,
          productId: currentProductId,
          updatedAt: Date.now(),
        })
      } else {
        await db.varieties.add({
          ...varietyFormData,
          productId: currentProductId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
      setVarietyFormOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving variety:', error)
    }
  }

  const handleDeleteVariety = async (id: number | undefined) => {
    if (!id || !confirm('Delete this variety?')) return
    try {
      await db.varieties.delete(id)
      loadData()
    } catch (error) {
      console.error('Error deleting variety:', error)
    }
  }

  const getProductVarieties = (productId: number) =>
    varieties.filter((v) => v.productId === productId)

  const getTotalValue = (productId: number) =>
    getProductVarieties(productId).reduce((sum, v) => sum + v.price * v.quantity, 0)

  const getTotalQuantity = (productId: number) =>
    getProductVarieties(productId).reduce((sum, v) => sum + v.quantity, 0)

  const isVarietyLowStock = (variety: Variety) => variety.quantity <= variety.minStockLevel

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Products & Varieties</h1>
          <p className="text-slate-600 mt-1">Manage your yogurt products and flavors</p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={handleAddProduct}
            className="button-primary flex items-center gap-2 px-4 py-3 rounded-2xl"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Total Products</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Total Varieties</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{varieties.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-600 font-medium">Total Stock Value</p>
            <p className="text-2xl font-bold text-cyan-600 mt-1">
              ₦{varieties.reduce((sum, v) => sum + v.price * v.quantity, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="p-4 md:p-6 space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-500 text-lg">No products found. Create one to get started!</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const productVarieties = getProductVarieties(product.id!)
            const isExpanded = expandedProduct === product.id
            const lowStockCount = productVarieties.filter(isVarietyLowStock).length

            return (
              <div key={product.id} className="card overflow-hidden">
                {/* Product Header */}
                <button
                  onClick={() => setExpandedProduct(isExpanded ? null : product.id || null)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-slate-600 mt-1">{product.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-slate-600">
                        {productVarieties.length} flavor{productVarieties.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-emerald-600 font-medium">
                        ₦{getTotalValue(product.id!).toLocaleString()}
                      </span>
                      {lowStockCount > 0 && (
                        <span className="text-red-600 font-medium">{lowStockCount} low stock</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditProduct(product)
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} className="text-slate-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProduct(product.id)
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-slate-600" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-600" />
                    )}
                  </div>
                </button>

                {/* Expanded Varieties */}
                {isExpanded && (
                  <div className="border-t border-slate-200">
                    <div className="p-4 space-y-3 bg-slate-50">
                      {productVarieties.length === 0 ? (
                        <p className="text-slate-600 text-sm">No varieties added yet.</p>
                      ) : (
                        productVarieties.map((variety) => (
                          <div
                            key={variety.id}
                            className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{variety.flavorName}</p>
                              <div className="flex gap-4 mt-1 text-sm">
                                <span className="text-slate-600">
                                  ₦{variety.price.toLocaleString()}
                                </span>
                                <span
                                  className={`font-medium ${
                                    isVarietyLowStock(variety)
                                      ? 'text-red-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {variety.quantity} pcs
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditVariety(variety)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} className="text-slate-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteVariety(variety.id)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      <button
                        onClick={() => handleAddVariety(product.id!)}
                        className="w-full mt-3 py-2 px-4 rounded-xl bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Add Variety
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Product Form Modal */}
      {productFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 max-h-screen md:max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProductId ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={() => setProductFormOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productFormData.name}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, name: e.target.value })
                  }
                  placeholder="e.g., Medium Yoghurt"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={productFormData.description}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              {/* When creating a new product, allow adding multiple variety rows inline */}
              {!editingProductId && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800">Varieties (optional)</h4>
                  {newVarieties.map((v, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Variety {idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => setNewVarieties(newVarieties.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          placeholder="Flavor name (e.g., Vanilla)"
                          value={v.flavorName}
                          onChange={(e) =>
                            setNewVarieties(newVarieties.map((row, i) => (i === idx ? { ...row, flavorName: e.target.value } : row)))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) =>
                              setNewVarieties(newVarieties.map((row, i) => (i === idx ? { ...row, price: parseFloat(e.target.value) || 0 } : row)))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300"
                            min="0"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={v.quantity}
                            onChange={(e) =>
                              setNewVarieties(newVarieties.map((row, i) => (i === idx ? { ...row, quantity: parseInt(e.target.value) || 0 } : row)))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300"
                            min="0"
                          />
                          <input
                            type="number"
                            placeholder="Min stock"
                            value={v.minStockLevel}
                            onChange={(e) =>
                              setNewVarieties(newVarieties.map((row, i) => (i === idx ? { ...row, minStockLevel: parseInt(e.target.value) || 0 } : row)))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewVarieties([...newVarieties, { flavorName: '', price: 0, quantity: 0, minStockLevel: 0 }])}
                      className="flex-1 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200 transition-colors"
                    >
                      + Add Variety Row
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewVarieties([{ flavorName: '', price: 0, quantity: 0, minStockLevel: 0 }])}
                      className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full button-primary py-3 rounded-xl font-medium">
                {editingProductId ? 'Update Product' : 'Add Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Variety Form Modal */}
      {varietyFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 max-h-screen md:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingVarietyId ? 'Edit Variety' : 'Add Variety'}
              </h2>
              <button
                onClick={() => setVarietyFormOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVariety} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Flavor Name *
                </label>
                <input
                  type="text"
                  value={varietyFormData.flavorName}
                  onChange={(e) =>
                    setVarietyFormData({ ...varietyFormData, flavorName: e.target.value })
                  }
                  placeholder="e.g., Vanilla, Strawberry"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price (₦) *
                </label>
                <input
                  type="number"
                  value={varietyFormData.price}
                  onChange={(e) =>
                    setVarietyFormData({
                      ...varietyFormData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g., 2000"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  min="0"
                  step="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={varietyFormData.quantity}
                    onChange={(e) =>
                      setVarietyFormData({
                        ...varietyFormData,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min. Stock Level
                  </label>
                  <input
                    type="number"
                    value={varietyFormData.minStockLevel}
                    onChange={(e) =>
                      setVarietyFormData({
                        ...varietyFormData,
                        minStockLevel: parseInt(e.target.value) || 0,
                      })
                    }
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>

              <button type="submit" className="w-full button-primary py-3 rounded-xl font-medium">
                {editingVarietyId ? 'Update Variety' : 'Add Variety'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
