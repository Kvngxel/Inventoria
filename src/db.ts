import Dexie, { type Table } from 'dexie';

// Product & Variety Management
export interface Product {
  id?: number;
  name: string; // E.g., "Medium Yoghurt", "Large Yoghurt"
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Variety {
  id?: number;
  productId: number; // Foreign key to Product
  flavorName: string; // E.g., "Vanilla", "Strawberry", "Plain", "Banana"
  price: number;
  quantity: number;
  minStockLevel: number;
  createdAt?: number;
  updatedAt?: number;
}

// Customer Management
export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Sales with Credit Tracking
export interface Sale {
  id?: number;
  varietyId: number; // Foreign key to Variety (changed from inventoryId)
  customerId?: number; // Optional - for named customers
  quantity: number;
  totalPrice: number;
  paymentStatus: 'cash' | 'credit' | 'partial'; // Payment type
  amountPaid: number; // Amount paid upfront (0 for full credit)
  timestamp: number;
  notes?: string;
  createdAt?: number;
}

// Payment Records (for tracking credit payments)
export interface Payment {
  id?: number;
  saleId: number;
  customerId: number;
  amount: number;
  timestamp: number;
  notes?: string;
}

// Backup interface for export/import
export interface BackupData {
  version: string;
  exportDate: number;
  products: Product[];
  varieties: Variety[];
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
}

export class InventoriaDB extends Dexie {
  products!: Table<Product>;
  varieties!: Table<Variety>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  payments!: Table<Payment>;

  constructor() {
    super('Inventoria');
    this.version(1).stores({
      products: '++id, name',
      varieties: '++id, productId, flavorName',
      customers: '++id, name, phone',
      sales: '++id, varietyId, customerId, timestamp, paymentStatus',
      payments: '++id, saleId, customerId, timestamp',
    });
  }
}

export const db = new InventoriaDB();

// Keep old InventoryItem interface for backward compatibility during migration
export interface InventoryItem {
  id?: number;
  name: string;
  category: string;
  quantity: number;
  price: number;
  minStockLevel: number;
  createdAt?: number;
  updatedAt?: number;
}
