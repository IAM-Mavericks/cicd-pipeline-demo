import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'sznpay-offline-cache';
const BALANCE_STORE = 'balances';
const TX_STORE = 'transactions';

export class OfflineCacheService {
    private db: Promise<IDBPDatabase>;

    constructor() {
        this.db = openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(BALANCE_STORE)) {
                    db.createObjectStore(BALANCE_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(TX_STORE)) {
                    db.createObjectStore(TX_STORE, { keyPath: 'payment_id' });
                }
            },
        });
    }

    async cacheBalance(account: any): Promise<void> {
        const db = await this.db;
        await db.put(BALANCE_STORE, account);
    }

    async getCachedBalance(accountId: string | number): Promise<any | null> {
        const db = await this.db;
        return db.get(BALANCE_STORE, accountId);
    }

    async getPrimaryBalance(): Promise<any | null> {
        const db = await this.db;
        const all = await db.getAll(BALANCE_STORE);
        // Assuming the first one cached or one marked primary
        return all[0] || null;
    }

    async cacheTransactions(transactions: any[]): Promise<void> {
        const db = await this.db;
        const tx = db.transaction(TX_STORE, 'readwrite');

        // Add new transactions
        for (const transaction of transactions) {
            await tx.store.put(transaction);
        }
        await tx.done;

        // Clean up old transactions, keeping only the 50 most recent
        await this.clearOldTransactions();
    }

    async getCachedTransactions(limit = 50): Promise<any[]> {
        const db = await this.db;
        const all = await db.getAll(TX_STORE);
        return all.sort((a, b) =>
            new Date(b.payment_created_at).getTime() - new Date(a.payment_created_at).getTime()
        ).slice(0, limit);
    }

    async clearOldTransactions(): Promise<void> {
        const db = await this.db;
        const all = await db.getAll(TX_STORE);

        // Sort by date descending
        const sorted = all.sort((a, b) =>
            new Date(b.payment_created_at).getTime() - new Date(a.payment_created_at).getTime()
        );

        // Keep only the 50 most recent
        const toDelete = sorted.slice(50);

        if (toDelete.length > 0) {
            const tx = db.transaction(TX_STORE, 'readwrite');
            for (const transaction of toDelete) {
                await tx.store.delete(transaction.payment_id);
            }
            await tx.done;
        }
    }
}

export const offlineCache = new OfflineCacheService();
