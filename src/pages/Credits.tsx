import { useState, useEffect } from 'react'
import { AlertCircle, TrendingDown, Calendar, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { db, type Sale, type Customer, type Payment } from '../db'

interface SaleWithDetails extends Sale {
  customerName?: string
  varietyName?: string
  varietyPrice?: number
}

interface CustomerCredit {
  customerId?: number
  customerName: string
  totalOwed: number
  totalPaid: number
  salesTotalPrice: number
  salesCount: number
  lastSaleDate: number
  paymentStatus: 'no-debt' | 'active-credit' | 'overdue'
}

export default function CreditsPage() {
  const [creditSales, setCreditSales] = useState<SaleWithDetails[]>([])
  const [customerCredits, setCustomerCredits] = useState<CustomerCredit[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null)
  const [stats, setStats] = useState({
    totalCreditSales: 0,
    totalAmountOwed: 0,
    totalAmountPaid: 0,
    activeCustomers: 0,
  })

  useEffect(() => {
    loadCreditData()
    const interval = setInterval(loadCreditData, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadCreditData = async () => {
    try {
      const allSales = await db.sales.toArray()
      const allCustomers = await db.customers.toArray()
      const allPayments = await db.payments.toArray()
      const allVarieties = await db.varieties.toArray()

      // Create maps for quick lookup
      const customerMap = new Map(allCustomers.map((c) => [c.id, c]))
      const varietyMap = new Map(allVarieties.map((v) => [v.id, v]))
      const paymentsByCustomer = new Map<number, Payment[]>()

      // Group payments by customer
      allPayments.forEach((p) => {
        if (!paymentsByCustomer.has(p.customerId)) {
          paymentsByCustomer.set(p.customerId, [])
        }
        paymentsByCustomer.get(p.customerId)!.push(p)
      })

      // Filter and enrich credit sales
      const enrichedCreditSales = allSales
        .filter((s) => s.paymentStatus === 'credit' || s.paymentStatus === 'partial')
        .map((s) => ({
          ...s,
          customerName: s.customerId ? customerMap.get(s.customerId)?.name : 'Walk-in Customer',
          varietyName: varietyMap.get(s.varietyId)?.flavorName || 'Unknown',
          varietyPrice: varietyMap.get(s.varietyId)?.price,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)

      setCreditSales(enrichedCreditSales)

      // Calculate customer credit balances
      const creditMap = new Map<number | undefined, CustomerCredit>()

      allSales
        .filter((s) => s.paymentStatus === 'credit' || s.paymentStatus === 'partial')
        .forEach((s) => {
          const customerId = s.customerId
          const customerName = s.customerId
            ? customerMap.get(s.customerId)?.name
            : `Walk-in (${new Date(s.timestamp).toLocaleDateString()})`

          if (!creditMap.has(customerId)) {
            creditMap.set(customerId, {
              customerId,
              customerName: customerName || 'Unknown',
              totalOwed: 0,
              totalPaid: s.amountPaid,
              salesTotalPrice: 0,
              salesCount: 0,
              lastSaleDate: s.timestamp,
              paymentStatus: 'no-debt',
            })
          }

          const credit = creditMap.get(customerId)!
          credit.salesTotalPrice += s.totalPrice
          credit.totalOwed = credit.salesTotalPrice - credit.totalPaid
          credit.salesCount += 1
          credit.lastSaleDate = Math.max(credit.lastSaleDate, s.timestamp)

          // Determine payment status
          if (credit.totalOwed > 0) {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
            credit.paymentStatus = credit.lastSaleDate < thirtyDaysAgo ? 'overdue' : 'active-credit'
          } else {
            credit.paymentStatus = 'no-debt'
          }
        })

      // Add payments to customer totals
      paymentsByCustomer.forEach((payments, customerId) => {
        if (creditMap.has(customerId)) {
          const credit = creditMap.get(customerId)!
          const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0)
          credit.totalPaid = paymentTotal
          credit.totalOwed = Math.max(0, credit.salesTotalPrice - paymentTotal)

          if (credit.totalOwed === 0) {
            credit.paymentStatus = 'no-debt'
          }
        }
      })

      const creditsList = Array.from(creditMap.values())
        .filter((c) => c.totalOwed > 0) // Only show those with outstanding balance
        .sort((a, b) => b.totalOwed - a.totalOwed)

      setCustomerCredits(creditsList)

      // Calculate stats
      const totalOwed = creditsList.reduce((sum, c) => sum + c.totalOwed, 0)
      const totalPaid = creditsList.reduce((sum, c) => sum + c.totalPaid, 0)

      setStats({
        totalCreditSales: enrichedCreditSales.length,
        totalAmountOwed: totalOwed,
        totalAmountPaid: totalPaid,
        activeCustomers: creditsList.length,
      })
    } catch (error) {
      console.error('Error loading credit data:', error)
    }
  }

  const recordPayment = async (customerId: number | undefined) => {
    if (!customerId) {
      alert('Cannot record payment for walk-in customers. Only registered customers can have payment records.')
      return
    }

    const customer = customerCredits.find((c) => c.customerId === customerId)
    if (!customer || customer.totalOwed <= 0) {
      alert('No outstanding balance for this customer')
      return
    }

    const amount = prompt(
      `Record payment for ${customer.customerName}\nOutstanding balance: ₦${customer.totalOwed.toLocaleString()}\n\nEnter amount:`
    )

    if (!amount || isNaN(parseFloat(amount))) return

    const paymentAmount = parseFloat(amount)
    if (paymentAmount <= 0 || paymentAmount > customer.totalOwed) {
      alert(`Invalid amount. Balance is ₦${customer.totalOwed.toLocaleString()}`)
      return
    }

    try {
      // Find the sale to link payment to
      const customerSale = creditSales.find((s) => s.customerId === customerId)
      if (!customerSale || !customerSale.id) {
        alert('Cannot find sale to link payment')
        return
      }

      await db.payments.add({
        saleId: customerSale.id,
        customerId,
        amount: paymentAmount,
        timestamp: Date.now(),
        notes: `Payment of ₦${paymentAmount.toLocaleString()}`,
      })

      loadCreditData()
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Error recording payment')
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            ⚠️ Overdue
          </span>
        )
      case 'active-credit':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            ⏱ Active
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            ✓ Paid
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Credits & Payments</h1>
          <p className="text-slate-600 mt-1">Track customer credit and payment history</p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center">
            <DollarSign className="mx-auto text-red-600 mb-2" size={24} />
            <p className="text-xs text-slate-600 font-medium">Total Owed</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              ₦{stats.totalAmountOwed.toLocaleString()}
            </p>
          </div>
          <div className="card text-center">
            <CheckCircle className="mx-auto text-emerald-600 mb-2" size={24} />
            <p className="text-xs text-slate-600 font-medium">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              ₦{stats.totalAmountPaid.toLocaleString()}
            </p>
          </div>
          <div className="card text-center">
            <AlertCircle className="mx-auto text-amber-600 mb-2" size={24} />
            <p className="text-xs text-slate-600 font-medium">Active Debtors</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.activeCustomers}</p>
          </div>
          <div className="card text-center">
            <Clock className="mx-auto text-cyan-600 mb-2" size={24} />
            <p className="text-xs text-slate-600 font-medium">Credit Sales</p>
            <p className="text-2xl font-bold text-cyan-600 mt-1">{stats.totalCreditSales}</p>
          </div>
        </div>
      </div>

      {/* Customer Credit List */}
      <div className="p-4 md:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Customer Balances</h2>

        {customerCredits.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="mx-auto text-emerald-600 mb-4" size={48} />
            <p className="text-slate-600 text-lg">No outstanding credit!</p>
            <p className="text-slate-500 text-sm mt-1">All customers are paid up.</p>
          </div>
        ) : (
          customerCredits.map((credit) => (
            <div
              key={credit.customerId}
              className={`card p-4 border-l-4 ${
                credit.paymentStatus === 'overdue'
                  ? 'border-red-500'
                  : credit.paymentStatus === 'active-credit'
                    ? 'border-amber-500'
                    : 'border-emerald-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{credit.customerName}</h3>
                    {getStatusBadge(credit.paymentStatus)}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-slate-600">Amount Owed</p>
                      <p className="font-semibold text-red-600">₦{credit.totalOwed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Total Sales</p>
                      <p className="font-semibold text-slate-900">
                        ₦{credit.salesTotalPrice.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Sales Count</p>
                      <p className="font-semibold text-slate-900">{credit.salesCount}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Last sale: {formatDate(credit.lastSaleDate)}
                  </p>
                </div>

                <button
                  onClick={() => recordPayment(credit.customerId)}
                  className="button-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                >
                  Record Payment
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Credit Sales History */}
      <div className="p-4 md:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Credit Sales History</h2>

        {creditSales.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-slate-500">No credit sales yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {creditSales.map((sale) => (
              <div
                key={sale.id}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCustomer(sale.customerId || null)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{sale.customerName}</h4>
                    <p className="text-sm text-slate-600 mt-1">{sale.varietyName}</p>

                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-slate-600">
                        {sale.quantity} pcs @ ₦{sale.varietyPrice?.toLocaleString()}
                      </span>
                      <span
                        className={`font-semibold ${
                          sale.paymentStatus === 'cash'
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        ₦{sale.totalPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      {sale.paymentStatus === 'partial' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                          Partial: ₦{sale.amountPaid.toLocaleString()} paid
                        </span>
                      )}
                      {sale.paymentStatus === 'credit' && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          Full Credit
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      {formatDate(sale.timestamp)}
                    </p>
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
