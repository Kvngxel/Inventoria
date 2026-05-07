# Inventoria - Developer Guide

## Project Overview
Inventoria is a Zero-Load, Offline-First Inventory PWA built with React, Vite, Dexie, and Tailwind CSS. It's designed as a mobile-first application with a bold, professional UI focused on quick interactions.

## Setup Status: ✅ COMPLETE

### What's Been Configured

#### 1. ✅ React Vite Project with TypeScript
- Framework: React 18.3.1
- Build Tool: Vite 5.4.21
- Language: TypeScript 5.4.2

#### 2. ✅ PWA Setup
- PWA Plugin: vite-plugin-pwa 0.19.2
- Service Worker: Configured with injectManifest strategy
- Manifest.json: Auto-generated with app metadata
- Auto-update enabled

#### 3. ✅ Local Database
- Database: Dexie 4.0.1 (IndexedDB wrapper)
- Schema: Inventory + Sales tables
- File: `src/db.ts`

#### 4. ✅ Icons & Components
- Icon Library: lucide-react 0.408.0
- Component Structure: Layout, BottomNav, Sidebar, Dashboard, Pages

#### 5. ✅ Styling
- CSS Framework: Tailwind CSS 3.4.3
- Theme: Custom "Macho-Friendly" theme
  - Deep Slates (#0f172a - #f8fafc)
  - Vibrant Emerald (#22c55e - #052e16)
  - Electric Blue/Cyan (#06b6d4 - #0c2d38)
  - Rounded: 2xl (1rem) for friendly feel
- PostCSS & Autoprefixer integrated

#### 6. ✅ Mobile-First Layout
- **Mobile**: Bottom navigation (Home, Inventory, Sales, Settings)
- **Desktop**: Auto-switches to left sidebar with main content
- Responsive breakpoints: md (768px)

#### 7. ✅ Database Schema
**Inventory Table**:
- id (auto-increment)
- name, category, quantity, price, minStockLevel
- createdAt, updatedAt timestamps

**Sales Table**:
- id (auto-increment)
- inventoryId (foreign key), quantity, totalPrice, timestamp

#### 8. ✅ Zero-Load Implementation
- Dashboard with instant UI updates using Dexie
- Quick Sell button updates stock immediately
- Real-time poll (500ms intervals) for reactive UI
- No network latency required

## Project Structure

```
Inventoria 2/
├── index.html              # Entry HTML with PWA meta tags
├── package.json            # Dependencies & scripts
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite + PWA configuration
├── tailwind.config.js     # Tailwind theme config
├── postcss.config.js      # PostCSS for Tailwind
├── README.md              # Project documentation
├── .gitignore             # Git ignore rules
└── src/
    ├── main.tsx           # React entry point
    ├── App.tsx            # App component with routing
    ├── index.css          # Global + component styles
    ├── db.ts              # Dexie database schema
    ├── sw.ts              # Service worker
    ├── components/
    │   ├── Layout.tsx     # Main layout wrapper
    │   ├── BottomNav.tsx  # Mobile bottom nav
    │   ├── Sidebar.tsx    # Desktop sidebar
    │   └── Dashboard.tsx  # Dashboard with Quick Sell
    └── pages/
        ├── Inventory.tsx  # Inventory CRUD
        ├── Sales.tsx      # Sales analytics
        └── Settings.tsx   # App settings
```

## Commands

```bash
# Development
npm run dev       # Start dev server on http://localhost:5173/

# Production
npm run build     # Build for production
npm run preview   # Preview production build locally

# Installation & Dependencies
npm install       # Install all dependencies
npm audit fix     # Fix security vulnerabilities (optional)
```

## Key Features Implemented

✨ **Dashboard**
- Stats cards: Total items, total value, low stock alerts
- Quick Sell grid: 1-column mobile, 3-column desktop
- Real-time inventory updates
- Low stock visual warnings

📦 **Inventory Management**
- Add/edit/delete items with modal form
- Category organization
- Min stock level tracking
- Total value calculations

💰 **Sales Tracking**
- Sales history with timestamps
- Revenue tracking
- Filterable reports (7/30/90 days)
- Item names enriched in sales records

🎬 **User Experience**
- Smooth transitions & hover effects
- Bold, high-contrast design
- Thumb-friendly buttons
- Mobile-optimized spacing

## Development Tips

### Adding a New Page
1. Create file in `src/pages/NewPage.tsx`
2. Import in `App.tsx`
3. Add route in App's switch statement
4. Add navigation item to BottomNav and Sidebar

### Modifying Theme
Edit `tailwind.config.js` `extend.colors` section. Changes auto-reload in dev mode.

### Database Operations
```typescript
import { db } from '@/db'

// Create
await db.inventory.add({ name: 'Item', category: 'Cat', ... })

// Read
const items = await db.inventory.toArray()
const item = await db.inventory.get(id)

// Update
await db.inventory.update(id, { quantity: 5 })

// Delete
await db.inventory.delete(id)
```

### Offline Testing
1. Open DevTools (F12)
2. Go to Network tab
3. Set throttling to "Offline"
4. App continues working perfectly

## Notes

- **Zero-Load**: All interactions use Dexie's instant updates
- **Offline-First**: All data stored locally, no server required
- **PWA**: Works as installed app on mobile & desktop
- **Service Worker**: Handles offline caching automatically

## Next Steps (Optional)

- [ ] Create placeholder PWA icons (pwa-192x192.png, pwa-512x512.png)
- [ ] Add data import/export functionality
- [ ] Implement barcode scanning integration
- [ ] Add printer support for invoices
- [ ] Create admin dashboard for analytics
