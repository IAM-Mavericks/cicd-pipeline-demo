import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'sznpay-offline';
const STORE_NAME = 'transaction-queue';

export type QueueStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export interface QueuedRequest {
    id: string;
    url: string;
    method: string;
    data: any;
    timestamp: number;
    status: QueueStatus;
    retryCount: number;
    lastError?: string;
    lastAttemptAt?: number;
}

class OfflineQueueService {
    private db: Promise<IDBPDatabase>;

    constructor() {
        this.db = openDB(DB_NAME, 2, {
            upgrade(db, oldVersion) {
                // Create or upgrade the store
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }

    async addToQueue(url: string, method: string, data: any): Promise<string> {
        const id = crypto.randomUUID();
        const request: QueuedRequest = {
            id,
            url,
            method,
            data,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
        };

        const db = await this.db;
        await db.put(STORE_NAME, request);
        return id;
    }

    async getQueue(): Promise<QueuedRequest[]> {
        const db = await this.db;
        return db.getAll(STORE_NAME);
    }

    async getPendingRequests(): Promise<QueuedRequest[]> {
        const all = await this.getQueue();
        return all.filter(req => req.status === 'pending' || req.status === 'failed');
    }

    async getFailedRequests(): Promise<QueuedRequest[]> {
        const all = await this.getQueue();
        return all.filter(req => req.status === 'failed');
    }

    async updateStatus(id: string, status: QueueStatus, error?: string): Promise<void> {
        const db = await this.db;
        const request = await db.get(STORE_NAME, id);

        if (request) {
            request.status = status;
            request.lastAttemptAt = Date.now();

            if (status === 'failed') {
                request.retryCount = (request.retryCount || 0) + 1;
                request.lastError = error;
            }

            await db.put(STORE_NAME, request);
        }
    }

    async markAsFailed(id: string, error: string): Promise<void> {
        await this.updateStatus(id, 'failed', error);
    }

    async markAsCompleted(id: string): Promise<void> {
        await this.updateStatus(id, 'completed');
    }

    async retryRequest(id: string): Promise<void> {
        await this.updateStatus(id, 'pending');
    }

    async removeFromQueue(id: string): Promise<void> {
        const db = await this.db;
        await db.delete(STORE_NAME, id);
    }

    async clearQueue(): Promise<void> {
        const db = await this.db;
        await db.clear(STORE_NAME);
    }

    async clearCompleted(): Promise<void> {
        const all = await this.getQueue();
        const completed = all.filter(req => req.status === 'completed');

        const db = await this.db;
        for (const req of completed) {
            await db.delete(STORE_NAME, req.id);
        }
    }
}

export const offlineQueue = new OfflineQueueService();
