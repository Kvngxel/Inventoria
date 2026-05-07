import { Settings, Database, Info } from 'lucide-react'

export default function SettingsPage() {
  const handleClearData = async () => {
    if (!confirm('This will delete all data. Are you sure?')) return

    try {
      // Note: In a real app, you'd clear Dexie data
      alert('Cleared all data (feature coming soon)')
    } catch (error) {
      console.error('Error clearing data:', error)
    }
  }

  const handleExportData = async () => {
    try {
      // Note: In a real app, you'd export Dexie data to JSON
      alert('Export data (feature coming soon)')
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your app preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-electric-100 p-3">
              <Settings size={24} className="text-electric-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">General Settings</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg" />
              <span className="text-slate-700 font-medium">Dark Mode (Coming Soon)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg" />
              <span className="text-slate-700 font-medium">Notifications</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg" />
              <span className="text-slate-700 font-medium">Auto-Sync (Offline)</span>
            </label>
          </div>
        </div>

        {/* Data Management */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-emerald-100 p-3">
              <Database size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Data Management</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full px-4 py-3 rounded-2xl bg-slate-200 text-slate-900 font-semibold hover:bg-slate-300 transition-all"
            >
              📥 Export Data as JSON
            </button>
            <button
              onClick={handleClearData}
              className="w-full px-4 py-3 rounded-2xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-all"
            >
              🗑️ Clear All Data
            </button>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-slate-200 p-3">
              <Info size={24} className="text-slate-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">About</h2>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Inventoria</strong> • Zero-Load, Offline-First Inventory Management
            </p>
            <p>
              <strong>Version</strong> • 0.0.1
            </p>
            <p>
              <strong>Built with</strong> • React, Vite, Dexie, Tailwind CSS
            </p>
            <p className="text-slate-500 mt-4">
              All data is stored locally on your device. No server sync required.
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="card bg-emerald-50 border-emerald-200">
          <p className="text-sm text-emerald-700">
            ✨ This app works completely offline. Your data never leaves your device.
          </p>
        </div>
      </div>
    </div>
  )
}
