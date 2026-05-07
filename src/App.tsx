import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import InventoryPage from './pages/Inventory'
import SalesPage from './pages/Sales'
import SettingsPage from './pages/Settings'

export type PageType = 'home' | 'inventory' | 'sales' | 'settings'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard />
      case 'inventory':
        return <InventoryPage />
      case 'sales':
        return <SalesPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App
