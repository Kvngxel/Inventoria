import { Home, Package, Users, ShoppingCart, DollarSign, Settings } from 'lucide-react'
import type { PageType } from '../App'

interface BottomNavProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
}

export default function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  const navItems: Array<{ page: PageType; label: string; icon: typeof Home }> = [
    { page: 'home', label: 'Home', icon: Home },
    { page: 'products', label: 'Products', icon: Package },
    { page: 'customers', label: 'Customers', icon: Users },
    { page: 'sales', label: 'Sales', icon: ShoppingCart },
    { page: 'credits', label: 'Credits', icon: DollarSign },
    { page: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white shadow-2xl overflow-x-auto">
      <div className="flex justify-between min-w-max md:justify-around h-20">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex flex-col items-center justify-center min-w-20 h-full gap-1 transition-colors ${
              currentPage === page
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
