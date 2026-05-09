export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Legacy Inventory</h1>
          <p className="text-slate-600 mt-1">This page has been replaced with Products & Varieties</p>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="card text-center py-12">
          <p className="text-slate-600 text-lg">Please use the <strong>Products</strong> page instead</p>
          <p className="text-slate-500 text-sm mt-2">Go to Products → Add Product → Add Variety</p>
        </div>
      </div>
    </div>
  )
}
