import { Settings, Database, Info, Download, Upload } from 'lucide-react'
import { db, type BackupData } from '../db'

export default function SettingsPage() {
  const handleExportData = async () => {
    try {
      const [products, varieties, customers, sales, payments] = await Promise.all([
        db.products.toArray(),
        db.varieties.toArray(),
        db.customers.toArray(),
        db.sales.toArray(),
        db.payments.toArray(),
      ])

      const backupData: BackupData = {
        version: '2.0',
        exportDate: Date.now(),
        products,
        varieties,
        customers,
        sales,
        payments,
      }

      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `inventoria-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert('✅ Data exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('❌ Error exporting data')
    }
  }

  const handleImportData = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'

      input.onchange = async (e: any) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event: any) => {
          try {
            const backupData: BackupData = JSON.parse(event.target.result)

            if (!backupData.version) {
              alert('❌ Invalid backup file format')
              return
            }

            // Confirm before importing
            if (
              !confirm(
                `This will import ${backupData.products.length} products, ${backupData.varieties.length} varieties, ${backupData.customers.length} customers, and ${backupData.sales.length} sales. Continue?`
              )
            ) {
              return
            }

            // Clear existing data
            await Promise.all([
              db.products.clear(),
              db.varieties.clear(),
              db.customers.clear(),
              db.sales.clear(),
              db.payments.clear(),
            ])

            // Import data
            await Promise.all([
              db.products.bulkAdd(backupData.products),
              db.varieties.bulkAdd(backupData.varieties),
              db.customers.bulkAdd(backupData.customers),
              db.sales.bulkAdd(backupData.sales),
              db.payments.bulkAdd(backupData.payments),
            ])

            alert('✅ Data imported successfully!')
            window.location.reload()
          } catch (error) {
            console.error('Error importing data:', error)
            alert('❌ Error importing data: Invalid file format')
          }
        }
        reader.readAsText(file)
      }

      input.click()
    } catch (error) {
      console.error('Error importing data:', error)
      alert('❌ Error importing data')
    }
  }

  const handleClearData = async () => {
    if (!confirm('⚠️ This will PERMANENTLY delete all your data. Are you absolutely sure?')) return
    if (!confirm('Last chance! Delete everything?')) return

    try {
      await Promise.all([
        db.products.clear(),
        db.varieties.clear(),
        db.customers.clear(),
        db.sales.clear(),
        db.payments.clear(),
      ])

      alert('✅ All data cleared')
      window.location.reload()
    } catch (error) {
      console.error('Error clearing data:', error)
      alert('❌ Error clearing data')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your app & data</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Data Management */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-emerald-100 p-3">
              <Database size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Data Management</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full px-4 py-3 rounded-2xl bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              <Download size={20} />
              📥 Export Data as JSON
            </button>

            <button
              onClick={handleImportData}
              className="w-full px-4 py-3 rounded-2xl bg-cyan-100 text-cyan-700 font-semibold hover:bg-cyan-200 transition-all flex items-center justify-center gap-2"
            >
              <Upload size={20} />
              📤 Import Data from JSON
            </button>

            <button
              onClick={handleClearData}
              className="w-full px-4 py-3 rounded-2xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-all"
            >
              🗑️ Clear All Data (⚠️ Permanent)
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-4">
            💡 Export regularly to back up your data. You can restore it anytime by importing the JSON file.
          </p>
        </div>

        {/* General Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-blue-100 p-3">
              <Settings size={24} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">General Settings</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg accent-emerald-600" />
              <span className="text-slate-700 font-medium">Enable Notifications</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg accent-emerald-600" />
              <span className="text-slate-700 font-medium">Auto-sync (Offline Mode)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded-lg accent-emerald-600" />
              <span className="text-slate-700 font-medium">Low Stock Alerts</span>
            </label>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-slate-200 p-3">
              <Info size={24} className="text-slate-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">About Inventoria</h2>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <strong>Version</strong>
              <p className="text-slate-600">2.0 • Yogurt Business Edition</p>
            </div>
            <div>
              <strong>Features</strong>
              <p className="text-slate-600">Products • Varieties • Customers • Credit Tracking • Offline-First</p>
            </div>
            <div>
              <strong>Technology</strong>
              <p className="text-slate-600">React • Vite • Dexie • Tailwind CSS</p>
            </div>
            <p className="text-slate-500 mt-4 p-3 bg-slate-50 rounded-lg">
              ✨ All your data is stored securely on your device. No server sync required. Your data is always yours.
            </p>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="card bg-emerald-50 border border-emerald-200">
          <h3 className="font-semibold text-emerald-900 mb-2">💡 Quick Tips</h3>
          <ul className="text-sm text-emerald-800 space-y-2">
            <li>• Set up products and varieties first</li>
            <li>• Add regular customers for easy credit tracking</li>
            <li>• Export data weekly for backup</li>
            <li>• Check Credits page to monitor who owes you</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
