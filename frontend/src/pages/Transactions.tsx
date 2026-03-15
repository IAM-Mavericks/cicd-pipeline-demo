import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  Calendar,
  CreditCard,
  Banknote,
  Globe
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Transaction } from '@/lib/types';
import {
  getUserLedgerAccounts,
  getLedgerAccountTransactions,
  type LedgerAccount,
  type LedgerAccountTransactionRow,
} from '@/lib/api';
import { offlineCache } from '@/services/offlineCache';

interface TransactionsProps {
  onNavigate: (page: string) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function Transactions({ onNavigate, user }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterAccountId, setFilterAccountId] = useState<'all' | string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLedgerLoading(true);
        setLedgerError(null);

        // Try to load from cache first if offline
        if (!navigator.onLine) {
          const cached = await offlineCache.getCachedTransactions(50);
          if (cached.length > 0) {
            // Map cached transactions to Transaction format
            const mapped: Transaction[] = cached.map((tx) => {
              const metadata = tx.payment_metadata as any;
              return {
                id: tx.payment_id,
                fromAccountId: String(tx.from_account_id),
                toAccountId: String(tx.to_account_id),
                amount: Number(tx.amount),
                currency: tx.currency,
                type: (tx.type as 'credit' | 'debit') || 'debit',
                category: (tx.category as Transaction['category']) || 'transfer',
                description: tx.description || tx.transaction_type,
                status: (tx.payment_status?.toLowerCase() as Transaction['status']) || 'pending',
                createdAt: new Date(tx.payment_created_at),
                recipient: metadata?.recipientName ? {
                  name: String(metadata.recipientName),
                  accountNumber: String(metadata.recipientAccountNumber || ''),
                  bank: String(metadata.recipientBankCode || '')
                } : undefined
              };
            });
            setTransactions(mapped);
            setLedgerLoading(false);
            return;
          }
        }

        const fetchedAccounts = await getUserLedgerAccounts();
        setAccounts(fetchedAccounts || []);

        if (!fetchedAccounts || fetchedAccounts.length === 0) {
          setTransactions([]);
          return;
        }

        const accountIds = new Set(fetchedAccounts.map((a) => a.id));

        const results = await Promise.all(
          fetchedAccounts.map((account) =>
            getLedgerAccountTransactions(account.id, 100, 0).catch(() => [])
          )
        );

        const combined: LedgerAccountTransactionRow[] = results.flat();

        combined.sort(
          (a, b) =>
            new Date(b.payment_created_at).getTime() -
            new Date(a.payment_created_at).getTime()
        );

        const mapped: Transaction[] = combined.map((tx) => {
          const isFromUser = accountIds.has(tx.from_account_id);
          const isToUser = accountIds.has(tx.to_account_id);
          const type: 'credit' | 'debit' = isToUser && !isFromUser ? 'credit' : 'debit';

          const isBankTransfer =
            tx.payment_metadata?.bankTransfer || tx.transaction_metadata?.bankTransfer;

          const category: Transaction['category'] = isBankTransfer
            ? 'payment'
            : 'transfer';

          const rawStatus = (tx.payment_status || 'PENDING').toLowerCase();
          const status: Transaction['status'] =
            rawStatus === 'completed'
              ? 'completed'
              : rawStatus === 'pending'
                ? 'pending'
                : 'failed';

          const recipient =
            tx.payment_metadata?.recipientAccountNumber ||
              tx.payment_metadata?.recipientName
              ? {
                name: String(tx.payment_metadata.recipientName || 'External account'),
                accountNumber: String(tx.payment_metadata.recipientAccountNumber || ''),
                bank: String(tx.payment_metadata.recipientBankCode || '')
              }
              : undefined;

          return {
            id: tx.payment_id,
            fromAccountId: String(tx.from_account_id),
            toAccountId: String(tx.to_account_id),
            amount: Number(tx.amount),
            currency: tx.currency,
            type,
            category,
            description: tx.description || tx.transaction_type,
            status,
            createdAt: new Date(tx.payment_created_at),
            recipient
          };
        });

        setTransactions(mapped);

        // Cache the 50 most recent transactions for offline access
        await offlineCache.cacheTransactions(combined.slice(0, 50));
      } catch (error) {
        console.error('Failed to load ledger transactions', error);
        setLedgerError('Unable to load transactions right now.');

        // Try to load from cache as fallback
        const cached = await offlineCache.getCachedTransactions(50);
        if (cached.length > 0) {
          const mapped: Transaction[] = cached.map((tx) => {
            const metadata = tx.payment_metadata as any;
            return {
              id: tx.payment_id,
              fromAccountId: String(tx.from_account_id),
              toAccountId: String(tx.to_account_id),
              amount: Number(tx.amount),
              currency: tx.currency,
              type: (tx.type as 'credit' | 'debit') || 'debit',
              category: (tx.category as Transaction['category']) || 'transfer',
              description: tx.description || tx.transaction_type,
              status: (tx.payment_status?.toLowerCase() as Transaction['status']) || 'pending',
              createdAt: new Date(tx.payment_created_at),
              recipient: metadata?.recipientName ? {
                name: String(metadata.recipientName),
                accountNumber: String(metadata.recipientAccountNumber || ''),
                bank: String(metadata.recipientBankCode || '')
              } : undefined
            };
          });
          setTransactions(mapped);
        }
      } finally {
        setLedgerLoading(false);
      }
    };

    loadTransactions();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      loadTransactions(); // Refresh when coming back online
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    });
    return formatter.format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTransactionIcon = (category: string, type: string) => {
    if (category === 'transfer' || category === 'deposit') {
      return type === 'credit' ? ArrowDownLeft : ArrowUpRight;
    } else if (category === 'payment') {
      return CreditCard;
    } else if (category === 'withdrawal') {
      return Banknote;
    }
    return ArrowUpRight;
  };

  const availableCurrencies = Array.from(new Set(transactions.map((t) => t.currency)));

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.recipient?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    const matchesCurrency = filterCurrency === 'all' || transaction.currency === filterCurrency;
    const matchesAccount =
      filterAccountId === 'all' ||
      transaction.fromAccountId === filterAccountId ||
      (transaction.toAccountId && transaction.toAccountId === filterAccountId);

    return matchesSearch && matchesType && matchesStatus && matchesCurrency && matchesAccount;
  });

  const totalIncome = transactions
    .filter(t => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.currency === 'NGN' ? t.amount : t.amount * 1500), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'debit' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.currency === 'NGN' ? t.amount : t.amount * 1500), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10">
        <Navbar currentPage="transactions" onNavigate={onNavigate} user={user} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
                <p className="text-gray-300">Track all your financial activities</p>
              </div>
              {isOffline && (
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  📡 Offline Mode - Showing Cached Transactions
                </Badge>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-md border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm font-medium">Total Income</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totalIncome, 'NGN')}
                    </p>
                  </div>
                  <ArrowDownLeft className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 backdrop-blur-md border-red-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-300 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totalExpenses, 'NGN')}
                    </p>
                  </div>
                  <ArrowUpRight className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-md border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Net Flow</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totalIncome - totalExpenses, 'NGN')}
                    </p>
                  </div>
                  <Globe className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white/5 backdrop-blur-md border-white/20 mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="all" className="text-white hover:bg-white/10">All Types</SelectItem>
                    <SelectItem value="credit" className="text-white hover:bg-white/10">Income</SelectItem>
                    <SelectItem value="debit" className="text-white hover:bg-white/10">Expenses</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="all" className="text-white hover:bg-white/10">All Status</SelectItem>
                    <SelectItem value="completed" className="text-white hover:bg-white/10">Completed</SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-white/10">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="all" className="text-white hover:bg-white/10">All Currencies</SelectItem>
                    {availableCurrencies.map((currency) => (
                      <SelectItem
                        key={currency}
                        value={currency}
                        className="text-white hover:bg-white/10"
                      >
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/10">
                {filteredTransactions.map((transaction) => {
                  const Icon = getTransactionIcon(transaction.category, transaction.type);
                  const fromAccount = accounts.find(
                    (a) => String(a.id) === transaction.fromAccountId
                  );
                  const toAccount = transaction.toAccountId
                    ? accounts.find((a) => String(a.id) === transaction.toAccountId)
                    : undefined;

                  const accountForDisplay =
                    transaction.type === 'debit'
                      ? fromAccount || toAccount
                      : toAccount || fromAccount;

                  const accountLabel = accountForDisplay
                    ? `${transaction.type === 'debit' ? 'From' : 'To'} ${accountForDisplay.currency
                    } • ${accountForDisplay.account_number}`
                    : null;
                  return (
                    <div key={transaction.id} className="p-6 hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${transaction.type === 'credit'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{transaction.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-gray-400 text-sm">{formatDate(transaction.createdAt)}</p>
                              {transaction.recipient && (
                                <>
                                  <span className="text-gray-600">•</span>
                                  <p className="text-gray-400 text-sm">{transaction.recipient.bank}</p>
                                </>
                              )}
                            </div>
                            {accountLabel && (
                              <p className="text-gray-500 text-xs mt-0.5">
                                {accountLabel}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-lg font-semibold ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <Badge
                            variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                            className={`mt-1 ${transaction.status === 'completed'
                              ? 'bg-green-500/20 text-green-300 border-green-500/30'
                              : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                              }`}
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}