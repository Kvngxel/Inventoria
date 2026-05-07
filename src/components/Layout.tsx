import { ReactNode } from 'react'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import type { PageType } from '../App'

interface LayoutProps {
  children: ReactNode
  currentPage: PageType
  onPageChange: (page: PageType) => void
}

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  return (
    <div className="flex h-screen flex-col md:flex-row bg-slate-50">
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="md:p-6">{children}</div>
      </main>

      {/* Bottom Navigation - Visible on mobile, hidden on desktop */}
      <BottomNav currentPage={currentPage} onPageChange={onPageChange} />
    </div>
  )
}
