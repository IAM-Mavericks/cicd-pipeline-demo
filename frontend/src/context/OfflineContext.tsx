import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { offlineQueue, QueuedRequest } from '../services/offlineQueue';
import axios from 'axios';
import { toast } from 'sonner';

interface OfflineContextType {
    isOffline: boolean;
    queueSize: number;
    syncQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [queueSize, setQueueSize] = useState(0);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            toast.success('System Online', {
                description: 'Reconnecting to SznPay network...',
            });
            syncQueue();
        };

        const handleOffline = () => {
            setIsOffline(true);
            toast.warning('System Offline', {
                description: 'You are in Unstoppable Mode. Transactions will be queued.',
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial queue size check
        updateQueueSize();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const updateQueueSize = async () => {
        const queue = await offlineQueue.getQueue();
        setQueueSize(queue.length);
    };

    const syncQueue = async () => {
        const queue = await offlineQueue.getQueue();
        if (queue.length === 0) return;

        toast.info('Syncing Notifications', {
            description: `Processing ${queue.length} queued transactions...`,
        });

        for (const request of queue) {
            try {
                await axios({
                    method: request.method,
                    url: request.url,
                    data: request.data,
                });
                await offlineQueue.removeFromQueue(request.id);
            } catch (error) {
                console.error('Failed to sync request:', request.id, error);
                // If it's a 4xx error, we might want to remove it, but if it's network, keep it.
            }
        }

        await updateQueueSize();
        toast.success('Sync Complete', {
            description: 'All offline transactions have been processed.',
        });
    };

    return (
        <OfflineContext.Provider value={{ isOffline, queueSize, syncQueue }}>
            {children}
        </OfflineContext.Provider>
    );
};
