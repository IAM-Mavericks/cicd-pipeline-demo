import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  EyeOff,
  Send,
  Download,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Globe,
  Shield,
  Zap,
  BarChart2,
  AlertTriangle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { InvestmentInsightsCard } from '@/components/investment/InvestmentInsightsCard';
import { getPrimaryLedgerAccount, getLedgerAccountTransactions, type LedgerAccount, type LedgerAccountTransactionRow } from '@/lib/api';
import { useOffline } from '@/context/OfflineContext';
import { offlineQueue } from '@/services/offlineQueue';
import { offlineCache } from '@/services/offlineCache';
import ErrorReconciliation from '@/components/ErrorReconciliation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DashboardProps {
  onNavigate: (page: string) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function Dashboard({ onNavigate, user }: DashboardProps) {
  const [showBalance, setShowBalance] = useState(true);
  const [ledgerAccount, setLedgerAccount] = useState<LedgerAccount | null>(null);
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerAccountTransactionRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [queuedTransactions, setQueuedTransactions] = useState<any[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [showErrorReconciliation, setShowErrorReconciliation] = useState(false);
  const { isOffline } = useOffline();

  useEffect(() => {
    const loadLedger = async () => {
      try {
        setLedgerLoading(true);
        setLedgerError(null);

        if (isOffline) {
          const cachedAccount = await offlineCache.getPrimaryBalance();
          const cachedTxns = await offlineCache.getCachedTransactions(5);
          const queue = await offlineQueue.getQueue();

          if (cachedAccount) setLedgerAccount(cachedAccount);
          setLedgerTransactions(cachedTxns);
          setQueuedTransactions(queue);
          return;
        }

        const account = await getPrimaryLedgerAccount();
        const txns = await getLedgerAccountTransactions(account.id, 5, 0);

        setLedgerAccount(account);
        setLedgerTransactions(txns);

        // Update cache
        await offlineCache.cacheBalance(account);
        await offlineCache.cacheTransactions(txns);

        // Also check queue
        const queue = await offlineQueue.getQueue();
        setQueuedTransactions(queue);

        // Check for failed transactions
        const failed = await offlineQueue.getFailedRequests();
        setFailedCount(failed.length);
      } catch (error) {
        console.error('Failed to load ledger data', error);
        // Try fallback to cache on error
        const cachedAccount = await offlineCache.getPrimaryBalance();
        const cachedTxns = await offlineCache.getCachedTransactions(5);
        if (cachedAccount) setLedgerAccount(cachedAccount);
        setLedgerTransactions(cachedTxns);
        setLedgerError('Unable to load live account data right now. Showing last known balance.');
      } finally {
        setLedgerLoading(false);
      }
    };

    loadLedger();
  }, [isOffline]);

  // Mock investment insights data
  const investmentInsights = {
    portfolioValue: 12500000,
    dailyChange: 125000,
    dailyChangePercent: 1.01,
    insights: [
      {
        id: '1',
        title: 'High Banking Sector Concentration',
        description: 'Your portfolio has 64.6% exposure to the banking sector, which increases risk.',
        severity: 'high' as const,
        action: 'Diversify'
      },
      {
        id: '2',
        title: 'NESTLE is Overvalued',
        description: 'NESTLE is trading at a P/E of 24.5x vs sector average of 18.2x.',
        severity: 'medium' as const,
        action: 'Review'
      },
      {
        id: '3',
        title: 'Strong Momentum in ZENITHBANK',
        description: 'ZENITHBANK has gained 12.3% over the past month.',
        severity: 'low' as const,
        action: 'View Chart'
      }
    ]
  };

  const handleViewPortfolio = () => {
    onNavigate('portfolio-insights');
  };

  const mockAccounts = [
    {
      id: '1',
      type: 'Naira Account',
      balance: 2500000,
      currency: 'NGN',
      accountNumber: '1234567890'
    },
    {
      id: '2',
      type: 'Dollar Account',
      balance: 5000,
      currency: 'USD',
      accountNumber: '0987654321'
    }
  ];

  const accounts = ledgerAccount
    ? [
      {
        id: String(ledgerAccount.id),
        type: 'Naira Account',
        balance: Number(ledgerAccount.balance),
        currency: ledgerAccount.currency,
        accountNumber: ledgerAccount.account_number
      }
    ]
    : mockAccounts;

  const mockRecentTransactions = [
    {
      id: '1',
      type: 'credit',
      amount: 50000,
      currency: 'NGN',
      description: 'Salary Payment',
      date: '2024-08-31',
      status: 'completed'
    },
    {
      id: '2',
      type: 'debit',
      amount: 15000,
      currency: 'NGN',
      description: 'Online Shopping',
      date: '2024-08-30',
      status: 'completed'
    },
    {
      id: '3',
      type: 'credit',
      amount: 200,
      currency: 'USD',
      description: 'Freelance Payment',
      date: '2024-08-29',
      status: 'pending'
    }
  ];

  const recentTransactions = [
    ...queuedTransactions.map(q => ({
      id: q.id,
      type: 'debit',
      amount: Number(q.data.amount),
      currency: q.data.currency,
      description: q.data.description || 'Queued Payment',
      date: new Date(q.timestamp).toISOString().slice(0, 10),
      status: 'queued'
    })),
    ...(ledgerAccount
      ? ledgerTransactions.map((tx) => ({
        id: tx.payment_id,
        type: tx.to_account_id === ledgerAccount.id ? 'credit' : 'debit',
        amount: Number(tx.amount),
        currency: tx.currency,
        description: tx.description || tx.transaction_type,
        date: new Date(tx.payment_created_at).toISOString().slice(0, 10),
        status: tx.payment_status.toLowerCase()
      }))
      : mockRecentTransactions)
  ].slice(0, 5);

  // Calculate projected balance
  const projectedBalance = ledgerAccount
    ? Number(ledgerAccount.balance) - queuedTransactions.reduce((acc, q) => acc + Number(q.data.amount), 0)
    : 0;

  const virtualCards = [
    {
      id: '1',
      type: 'visa',
      nickname: 'Online Shopping',
      balance: 100000,
      status: 'active'
    },
    {
      id: '2',
      type: 'mastercard',
      nickname: 'Subscriptions',
      balance: 50000,
      status: 'active'
    }
  ];

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    });
    return formatter.format(amount);
  };

  const quickActions = [
    { icon: Send, label: 'Send Money', action: () => onNavigate('payments') },
    { icon: Zap, label: 'Pay Bills', action: () => onNavigate('bill-payments') },
    { icon: CreditCard, label: 'Virtual Cards', action: () => onNavigate('cards') },
    { icon: Globe, label: 'Foreign Accounts', action: () => onNavigate('accounts') }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10">
        <Navbar currentPage="dashboard" onNavigate={onNavigate} user={user} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your money today.</p>
          </div>

          {/* Account Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {accounts.map((account) => (
              <Card key={account.id} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border-white/20 hover:from-white/15 hover:to-white/10 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {account.type}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {showBalance ? formatCurrency(isOffline ? projectedBalance : account.balance, account.currency) : '••••••'}
                  </div>
                  {isOffline && queuedTransactions.length > 0 && (
                    <p className="text-[10px] text-orange-400 font-medium uppercase tracking-tighter">Projected Balance (Sync Pending)</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {account.accountNumber}
                  </p>
                </CardContent>
              </Card>
            ))}

            {/* Total Portfolio */}
            <Card className="bg-gradient-to-br from-green-500/20 to-blue-600/20 backdrop-blur-md border-green-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Portfolio
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {showBalance ? '₦2,750,000' : '••••••'}
                </div>
                <p className="text-xs text-green-400">
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-20 flex-col space-y-2 bg-muted/20 border-border hover:bg-muted/40 text-foreground"
                    onClick={action.action}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Failed Transactions Alert */}
            {failedCount > 0 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  onClick={() => setShowErrorReconciliation(true)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {failedCount} Failed Transaction{failedCount > 1 ? 's' : ''} - Click to Review
                </Button>
              </div>
            )}
          </div>

          <div className="mb-8">
            <InvestmentInsightsCard
              portfolioValue={investmentInsights.portfolioValue}
              dailyChange={investmentInsights.dailyChange}
              dailyChangePercent={investmentInsights.dailyChangePercent}
              insights={investmentInsights.insights}
              onViewPortfolio={handleViewPortfolio}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Transactions */}
            <Card className="bg-white/5 backdrop-blur-md border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">Recent Transactions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300"
                  onClick={() => onNavigate('transactions')}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'credit'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                        }`}>
                        {transaction.type === 'credit' ?
                          <ArrowDownLeft className="h-5 w-5" /> :
                          <ArrowUpRight className="h-5 w-5" />
                        }
                      </div>
                      <div>
                        <p className="text-foreground font-medium">{transaction.description}</p>
                        <p className="text-muted-foreground text-sm">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <Badge
                        variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Virtual Cards */}
            <Card className="bg-white/5 backdrop-blur-md border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">Virtual Cards</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300"
                  onClick={() => onNavigate('cards')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Card
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {virtualCards.map((card) => (
                  <div key={card.id} className="p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-5 w-5 text-blue-400" />
                        <span className="text-foreground font-medium">{card.nickname}</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        {card.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm uppercase">{card.type}</span>
                      <span className="text-foreground font-semibold">
                        {formatCurrency(card.balance, 'NGN')}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Security Status */}
          <Card className="mt-8 bg-gradient-to-r from-green-500/10 to-blue-600/10 backdrop-blur-md border-green-500/20">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-green-400" />
                <div>
                  <p className="text-foreground font-medium">Account Security: Excellent</p>
                  <p className="text-muted-foreground text-sm">All security features are active</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => onNavigate('security')}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Error Reconciliation Modal */}
      <Dialog open={showErrorReconciliation} onOpenChange={setShowErrorReconciliation}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Failed Transactions</DialogTitle>
          </DialogHeader>
          <ErrorReconciliation
            onClose={() => setShowErrorReconciliation(false)}
            onRetrySuccess={async () => {
              // Reload failed count
              const failed = await offlineQueue.getFailedRequests();
              setFailedCount(failed.length);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}