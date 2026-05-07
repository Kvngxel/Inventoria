import Dexie, { type Table } from 'dexie';

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

export interface Sale {
  id?: number;
  inventoryId: number;
  quantity: number;
  totalPrice: number;
  timestamp: number;
}

export class InventoriaDB extends Dexie {
  inventory!: Table<InventoryItem>;
  sales!: Table<Sale>;

  constructor() {
    super('Inventoria');
    this.version(1).stores({
      inventory: '++id, category, name',
      sales: '++id, inventoryId, timestamp',
    });
  }
}

export const db = new InventoriaDB();
