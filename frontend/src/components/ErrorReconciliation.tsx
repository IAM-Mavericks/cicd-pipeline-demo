/**
 * Error Reconciliation Component
 * Displays failed offline transaction syncs and allows users to retry or delete them
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertTriangle,
    RefreshCw,
    Trash2,
    Clock,
    CheckCircle2,
    XCircle,
    Info
} from 'lucide-react';
import { toast } from 'sonner';
import { offlineQueue, type QueuedRequest } from '@/services/offlineQueue';

interface ErrorReconciliationProps {
    onClose?: () => void;
    onRetrySuccess?: () => void;
}

export default function ErrorReconciliation({ onClose, onRetrySuccess }: ErrorReconciliationProps) {
    const [failedRequests, setFailedRequests] = useState<QueuedRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);

    const loadFailedRequests = async () => {
        try {
            setLoading(true);
            const failed = await offlineQueue.getFailedRequests();
            setFailedRequests(failed);
        } catch (error) {
            console.error('Failed to load error queue:', error);
            toast.error('Failed to load failed transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFailedRequests();
    }, []);

    const handleRetry = async (request: QueuedRequest) => {
        try {
            setRetrying(request.id);

            // Mark as pending to retry
            await offlineQueue.retryRequest(request.id);

            toast.success('Transaction queued for retry', {
                description: 'The transaction will be retried when you\'re online.'
            });

            // Reload the list
            await loadFailedRequests();

            if (onRetrySuccess) {
                onRetrySuccess();
            }
        } catch (error: any) {
            console.error('Retry failed:', error);
            toast.error('Failed to retry transaction', {
                description: error.message
            });
        } finally {
            setRetrying(null);
        }
    };

    const handleDelete = async (request: QueuedRequest) => {
        try {
            await offlineQueue.removeFromQueue(request.id);

            toast.success('Failed transaction removed');

            // Reload the list
            await loadFailedRequests();
        } catch (error: any) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete transaction', {
                description: error.message
            });
        }
    };

    const handleClearAll = async () => {
        try {
            for (const req of failedRequests) {
                await offlineQueue.removeFromQueue(req.id);
            }

            toast.success('All failed transactions cleared');
            await loadFailedRequests();
        } catch (error: any) {
            console.error('Clear all failed:', error);
            toast.error('Failed to clear transactions');
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return new Intl.DateTimeFormat('en-NG', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getTransactionDescription = (request: QueuedRequest) => {
        try {
            const data = request.data;
            if (data.amount && data.recipientAccountNumber) {
                return `Transfer ₦${Number(data.amount).toLocaleString()} to ${data.recipientAccountNumber}`;
            }
            return `${request.method} ${request.url}`;
        } catch {
            return `${request.method} ${request.url}`;
        }
    };

    if (loading) {
        return (
            <Card className="bg-slate-900/50 border-orange-500/30 backdrop-blur-xl">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                        <span className="ml-2 text-gray-400">Loading failed transactions...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (failedRequests.length === 0) {
        return (
            <Card className="bg-slate-900/50 border-green-500/30 backdrop-blur-xl">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-green-400" />
                        <CardTitle className="text-xl">All Clear!</CardTitle>
                    </div>
                    <CardDescription className="text-gray-400">
                        No failed transactions to reconcile
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert className="bg-green-500/10 border-green-500/20">
                        <Info className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-gray-300">
                            All your offline transactions have been successfully synced.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-900/50 border-orange-500/30 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-orange-400" />
                        <CardTitle className="text-xl">Failed Transactions</CardTitle>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                        {failedRequests.length} Failed
                    </Badge>
                </div>
                <CardDescription className="text-gray-400">
                    These transactions failed to sync. You can retry or delete them.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Clear All Button */}
                {failedRequests.length > 1 && (
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAll}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear All
                        </Button>
                    </div>
                )}

                {/* Failed Requests List */}
                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {failedRequests.map((request) => (
                            <div
                                key={request.id}
                                className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-3"
                            >
                                {/* Transaction Info */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-white font-medium">
                                            {getTransactionDescription(request)}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTimestamp(request.timestamp)}
                                            </span>
                                            <span>•</span>
                                            <span>Retry {request.retryCount}x</span>
                                        </div>
                                    </div>
                                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                </div>

                                {/* Error Message */}
                                {request.lastError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                                        <p className="text-xs text-red-300 font-mono">
                                            {request.lastError}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleRetry(request)}
                                        disabled={retrying === request.id}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        {retrying === request.id ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Retrying...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Retry
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(request)}
                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Info Alert */}
                <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-gray-300 text-xs">
                        Retried transactions will be processed when you're back online. If a transaction continues to fail, please contact support.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
