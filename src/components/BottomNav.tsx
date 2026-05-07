import { Home, Package, ShoppingCart, Settings } from 'lucide-react'
import type { PageType } from '../App'

interface BottomNavProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
}

export default function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  const navItems: Array<{ page: PageType; label: string; icon: typeof Home }> = [
    { page: 'home', label: 'Home', icon: Home },
    { page: 'inventory', label: 'Inventory', icon: Package },
    { page: 'sales', label: 'Sales', icon: ShoppingCart },
    { page: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white shadow-2xl">
      <div className="flex justify-around h-20">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              currentPage === page
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
