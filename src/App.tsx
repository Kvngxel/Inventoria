import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import ProductsPage from './pages/Products'
import CustomersPage from './pages/Customers'
import SalesPage from './pages/Sales'
import CreditsPage from './pages/Credits'
import SettingsPage from './pages/Settings'

export type PageType = 'home' | 'products' | 'customers' | 'sales' | 'credits' | 'settings'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard />
      case 'products':
        return <ProductsPage />
      case 'customers':
        return <CustomersPage />
      case 'sales':
        return <SalesPage />
      case 'credits':
        return <CreditsPage />
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
