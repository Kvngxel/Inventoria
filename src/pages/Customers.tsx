import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Search, X, Phone, MapPin } from 'lucide-react'
import { db, type Customer } from '../db'

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
