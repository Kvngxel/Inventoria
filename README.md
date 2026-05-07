# Inventoria

🚀 **Zero-Load, Offline-First Inventory PWA** — A mobile-first inventory management system that works completely offline using Dexie local database.

## Features

✨ **Mobile-First UI**
- Bottom navigation bar on mobile
- Auto-converts to desktop sidebar on larger screens
- Thumb-friendly, large buttons for quick actions

📦 **Inventory Management**
- Add, edit, delete inventory items
- Track stock levels with low-stock warnings
- Organize by categories
- Real-time quantity tracking

💰 **Sales Tracking**
- Quick-sell buttons for instant transactions
- Sales history with timestamps
- Revenue analytics
- Filterable sales reports (7, 30, 90 days)

📊 **Dashboard**
- 1-column layout on mobile, 3-column on desktop
- Key metrics: total items, total value, low stock items
- Quick sell cards with real-time updates

🎨 **Design System**
- Deep slate colors + vibrant emerald/electric blue
- Macho-friendly rounded corners (2xl)
- High-contrast, professional UI
- Responsive and accessible

🔐 **Offline-First**
- All data stored locally using Dexie
- Works without internet connection
- PWA support (installable)
- Service worker for offline functionality

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Database**: Dexie (IndexedDB wrapper)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/        # Reusable components
│   ├── Layout.tsx    # Main layout with navigation
│   ├── BottomNav.tsx # Mobile bottom navigation
│   ├── Sidebar.tsx   # Desktop sidebar
│   └── Dashboard.tsx # Dashboard component
├── pages/            # Page components
│   ├── Inventory.tsx # Inventory management
│   ├── Sales.tsx     # Sales tracking
│   └── Settings.tsx  # App settings
├── db.ts             # Dexie database schema
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles & Tailwind
```

## Database Schema

### Inventory Table
```typescript
{
  id: number          // Auto-increment ID
  name: string        // Item name
  category: string    // Item category
  quantity: number    // Current stock
  price: number       // Price per unit
  minStockLevel: number // Reorder threshold
  createdAt: number   // Timestamp
  updatedAt: number   // Timestamp
}
```

### Sales Table
```typescript
{
  id: number          // Auto-increment ID
  inventoryId: number // Reference to inventory item
  quantity: number    // Units sold
  totalPrice: number  // Sale total
  timestamp: number   // Sale timestamp
}
```

## Usage

### Mobile Navigation
- **Home**: Dashboard with quick stats and sell buttons
- **Inventory**: Add/edit/delete items
- **Sales**: View sales history and analytics
- **Settings**: App preferences

### Desktop Navigation
- Sidebar automatically appears on md screens and larger
- Same functionality as mobile

### Quick Sell
- Click "Quick Sell" on any inventory card
- Instantly updates stock using Dexie
- Records sale with timestamp
- UI refreshes in real-time

## Performance Note

**Zero-Load Logic**: All database operations use Dexie's synchronous-like API for instant UI updates without network delays. The app is designed for sub-100ms interactions.

## PWA Installation

1. Open on mobile browser or desktop Chrome
2. Click "Install" or "Add to Home Screen"
3. App installs as a standalone app
4. Works offline completely

## Customization

### Theme Colors
Edit `tailwind.config.js` to customize:
- Deep slate colors
- Emerald green accent
- Electric blue accent
- Border radius

### Icons
All icons from Lucide React. See `lucide-react` docs for available icons.

## Future Enhancements

- [ ] Cloud sync with optional server
- [ ] Barcode scanning
- [ ] Multiple users/stores
- [ ] Advanced reporting
- [ ] Dark mode
- [ ] Data export/import

## License

MIT — Feel free to use this for anything

---

**Built with ❤️ for offline-first inventory management**
