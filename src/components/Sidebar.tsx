import { Home, Package, Users, ShoppingCart, DollarSign, Settings, Zap } from 'lucide-react'
import type { PageType } from '../App'

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const navItems: Array<{ page: PageType; label: string; icon: typeof Home }> = [
    { page: 'home', label: 'Home', icon: Home },
    { page: 'products', label: 'Products', icon: Package },
    { page: 'customers', label: 'Customers', icon: Users },
    { page: 'sales', label: 'Sales', icon: ShoppingCart },
    { page: 'credits', label: 'Credits', icon: DollarSign },
    { page: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white shadow-lg">
      {/* Logo/Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 p-6">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-3">
          <Zap size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventoria</h1>
          <p className="text-xs text-slate-500">Yogurt Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${
              currentPage === page
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4 text-center">
        <p className="text-xs text-slate-500">v2.0 • Offline Ready</p>
        <p className="text-xs text-slate-400 mt-1">Products • Varieties • Credits</p>
      </div>
    </aside>
  )
}
