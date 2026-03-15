import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Wallet, Globe } from 'lucide-react';
import { getUserLedgerAccounts, openUserLedgerAccount, convertBetweenAccounts, type LedgerAccount } from '@/lib/api';
import { toast } from 'sonner';

interface FxTopUpDialogProps {
  primaryAccount: LedgerAccount | null;
  targetAccount: LedgerAccount;
  onSuccess: () => void;
}

function FxTopUpDialog({ primaryAccount, targetAccount, onSuccess }: FxTopUpDialogProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!primaryAccount) {
    return null;
  }

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const fromCurrency = (primaryAccount.currency || '').toUpperCase();
      const toCurrency = (targetAccount.currency || '').toUpperCase();

      const response = await convertBetweenAccounts({
        fromAccountId: primaryAccount.id,
        toAccountId: targetAccount.id,
        amount,
        description: `FX convert ${fromCurrency} to ${toCurrency}`,
      });

      if (response.success) {
        toast.success(response.message || 'Conversion completed');
        setAmount('');
        onSuccess();
      } else {
        toast.error(response.message || 'Conversion failed');
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
      toast.error(apiMessage || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const fromLabel = `NGN • ${primaryAccount.account_number}`;
  const toLabel = `${targetAccount.currency} • ${targetAccount.account_number}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="mt-3 border-white/40 text-white hover:bg-white/10"
        >
          Top up
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Top up {targetAccount.currency} account</DialogTitle>
          <DialogDescription>
            Move funds from your Naira account into this {targetAccount.currency} account using an indicative FX rate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="text-xs text-gray-300">
            <p>From: {fromLabel}</p>
            <p>To: {toLabel}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-200">Amount in Naira (NGN)</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" className="border-white/20 text-gray-200 hover:bg-white/10">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            >
              {loading ? 'Converting...' : 'Convert & Top up'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FxTopUpFromForeignDialogProps {
  nairaAccount: LedgerAccount | null;
  foreignAccounts: LedgerAccount[];
  onSuccess: () => void;
}

function FxTopUpFromForeignDialog({
  nairaAccount,
  foreignAccounts,
  onSuccess,
}: FxTopUpFromForeignDialogProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceId, setSourceId] = useState<number | null>(
    foreignAccounts[0]?.id ?? null
  );

  if (!nairaAccount || foreignAccounts.length === 0 || sourceId === null) {
    return null;
  }

  const sourceAccount = foreignAccounts.find((a) => a.id === sourceId) ?? foreignAccounts[0];

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!sourceAccount) {
      toast.error('Please select a source account');
      return;
    }

    try {
      setLoading(true);
      const fromCurrency = (sourceAccount.currency || '').toUpperCase();
      const toCurrency = (nairaAccount.currency || '').toUpperCase();

      const response = await convertBetweenAccounts({
        fromAccountId: sourceAccount.id,
        toAccountId: nairaAccount.id,
        amount,
        description: `FX convert ${fromCurrency} to ${toCurrency}`,
      });

      if (response.success) {
        toast.success(response.message || 'Conversion completed');
        setAmount('');
        onSuccess();
      } else {
        toast.error(response.message || 'Conversion failed');
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
      toast.error(apiMessage || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const fromLabel = `${sourceAccount.currency} • ${sourceAccount.account_number}`;
  const toLabel = `NGN • ${nairaAccount.account_number}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="mt-3 border-white/40 text-white hover:bg-white/10"
        >
          Top up
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Top up Naira account</DialogTitle>
          <DialogDescription>
            Move funds from one of your foreign currency accounts into this Naira account using an indicative FX rate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <p className="text-sm text-gray-200">Source account</p>
            <select
              className="w-full rounded-md bg-white/5 border border-white/20 px-3 py-2 text-sm text-white"
              value={sourceId ?? ''}
              onChange={(e) => setSourceId(Number(e.target.value))}
            >
              {foreignAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.currency} • {account.account_number}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-300">
            <p>From: {fromLabel}</p>
            <p>To: {toLabel}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-200">
              Amount in {sourceAccount.currency} ({sourceAccount.currency})
            </p>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" className="border-white/20 text-gray-200 hover:bg-white/10">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            >
              {loading ? 'Converting...' : 'Convert & Top up'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AccountsProps {
  onNavigate: (page: string) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function Accounts({ onNavigate, user }: AccountsProps) {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingCurrency, setOpeningCurrency] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserLedgerAccounts();
      setAccounts(data || []);
    } catch (err) {
      console.error('Failed to load ledger accounts', err);
      setError('Unable to load your accounts right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenWallet = async (currency: string) => {
    if (openingCurrency) return;

    try {
      setOpeningCurrency(currency);
      const account = await openUserLedgerAccount(currency);
      toast.success(`${currency.toUpperCase()} account is ready to use`);

      // Refresh accounts list to reflect latest balances and any other wallets
      await loadAccounts();

      // Optionally scroll into view or highlight the new account in future
      return account;
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
      toast.error(apiMessage || `Could not open ${currency.toUpperCase()} account`);
    } finally {
      setOpeningCurrency(null);
    }
  };

  const primaryAccounts = accounts.filter((a) => a.currency === 'NGN');
  const foreignAccounts = accounts.filter((a) => a.currency !== 'NGN');
  const primaryAccount = primaryAccounts[0] || null;

  const formatCurrency = (amount: string, currency: string) => {
    const num = Number(amount || 0);
    const formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    });
    return formatter.format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000" />
        </div>
      </div>

      <div className="relative z-10">
        <Navbar currentPage="accounts" onNavigate={onNavigate} user={user} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Accounts</h1>
            <p className="text-muted-foreground">
              View your local Naira account and foreign currency accounts linked to your virtual cards.
            </p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-muted-foreground">Loading accounts...</p>
          ) : (
            <div className="space-y-10">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-green-400" />
                    <h2 className="text-xl font-semibold text-foreground">Naira Account</h2>
                  </div>
                  <Badge variant="outline" className="border-green-500/40 text-green-300">
                    {primaryAccounts.length} account{primaryAccounts.length === 1 ? '' : 's'}
                  </Badge>
                </div>

                {primaryAccounts.length === 0 ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      You don&apos;t have any Naira accounts yet. Your primary account will appear here.
                    </p>
                    <Button
                      variant="default"
                      className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                      onClick={() => handleOpenWallet('NGN')}
                      disabled={openingCurrency === 'NGN' || loading}
                   >
                      {openingCurrency === 'NGN' ? 'Opening Naira account...' : 'Open Naira account'}
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {primaryAccounts.map((account) => (
                      <Card key={account.id} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border-white/20">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Naira Account
                            </CardTitle>
                            <Badge variant="outline" className="border-white/30 text-white text-xs">
                              {account.currency}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-foreground mb-1">
                            {formatCurrency(account.balance, account.currency)}
                          </div>
                          <p className="text-xs text-muted-foreground">{account.account_number}</p>
                          <FxTopUpFromForeignDialog
                            nairaAccount={account}
                            foreignAccounts={foreignAccounts}
                            onSuccess={loadAccounts}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-foreground">Foreign Accounts</h2>
                  </div>
                  <Badge variant="outline" className="border-blue-500/40 text-blue-300">
                    {foreignAccounts.length} account{foreignAccounts.length === 1 ? '' : 's'}
                  </Badge>
                </div>

                {foreignAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You haven&apos;t opened any foreign currency accounts yet. When you create a virtual card in a foreign currency, the linked account will appear here.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {foreignAccounts.map((account) => (
                      <Card key={account.id} className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md border-blue-500/40">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-blue-100">
                              {account.currency} Account
                            </CardTitle>
                            <Badge variant="outline" className="border-white/40 text-white text-xs">
                              {account.currency}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white mb-1">
                            {formatCurrency(account.balance, account.currency)}
                          </div>
                          <p className="text-xs text-blue-100/80">{account.account_number}</p>
                          <FxTopUpDialog
                            primaryAccount={primaryAccount}
                            targetAccount={account}
                            onSuccess={loadAccounts}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
