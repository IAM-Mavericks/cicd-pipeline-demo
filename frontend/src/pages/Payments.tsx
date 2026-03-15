import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Globe,
  Banknote,
  QrCode,
  Contact,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Store,
  Search,
  Building2,
  ShoppingCart,
  Zap,
  Phone,
  Car,
  GraduationCap,
  Tv,
  Plane,
  Loader2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAutoBankVerification, useManualBankVerification } from '@/hooks/use-bank-verification';
import { BankVerificationStatus, BankVerificationIndicator } from '@/components/bank-verification-status';
import { toast } from 'sonner';
import { performBankTransfer, getUserLedgerAccounts, type LedgerAccount } from '@/lib/api';
import { useOffline } from '@/context/OfflineContext';
import { offlineQueue } from '@/services/offlineQueue';
import SMSFallback from '@/components/SMSFallback';

interface PaymentsProps {
  onNavigate: (page: string) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

type Recipient =
  | { type: 'bank'; name: string; account: string; bank: string }
  | { type: 'merchant'; name: string; code: string; category: string };

type ApiError = { response?: { data?: { message?: string; error?: string } } };

export default function Payments({ onNavigate, user }: PaymentsProps) {
  const [activeTab, setActiveTab] = useState('local');
  const [recipientType, setRecipientType] = useState<'bank' | 'merchant'>('bank');
  const [selectedMerchantCategory, setSelectedMerchantCategory] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    recipient: '',
    accountNumber: '',
    bankCode: '',
    merchantId: '',
    merchantCode: '',
    customerReference: '',
    description: '',
    currency: 'NGN'
  });
  const [wallets, setWallets] = useState<LedgerAccount[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const { isOffline, syncQueue } = useOffline();

  // Bank verification for local transfers
  const localBankVerification = useAutoBankVerification(
    paymentData.accountNumber,
    paymentData.bankCode,
    false, // not international
    'NG'
  );

  // Bank verification for international transfers
  const intlBankVerification = useManualBankVerification();

  // Load user accounts for per-currency awareness
  useEffect(() => {
    const loadWallets = async () => {
      try {
        setWalletsLoading(true);
        setWalletsError(null);

        const data = await getUserLedgerAccounts();
        setWallets(data || []);
      } catch (err) {
        console.error('Failed to load accounts for payments', err);
        setWalletsError('Unable to load your accounts. Please try again later.');
      } finally {
        setWalletsLoading(false);
      }
    };

    loadWallets();
  }, []);

  // Clear verification when switching tabs or recipient types
  useEffect(() => {
    localBankVerification.clearVerification();
    intlBankVerification.clearVerification();
    setPaymentData(prev => ({
      ...prev,
      recipient: '',
      accountNumber: '',
      bankCode: ''
    }));
  }, [activeTab, recipientType]);

  // Show quick UI message when bank verification fails (local)
  const lastShownErrorRef = useRef<{ local: string | null; intl: string | null }>({ local: null, intl: null });

  useEffect(() => {
    if (
      !localBankVerification.isVerifying &&
      localBankVerification.error &&
      localBankVerification.error !== lastShownErrorRef.current.local
    ) {
      lastShownErrorRef.current.local = localBankVerification.error;
      toast.error(localBankVerification.error);
    }
  }, [localBankVerification.error, localBankVerification.isVerifying]);

  // Show quick UI message when bank verification fails (international)
  useEffect(() => {
    if (
      !intlBankVerification.isVerifying &&
      intlBankVerification.error &&
      intlBankVerification.error !== lastShownErrorRef.current.intl
    ) {
      lastShownErrorRef.current.intl = intlBankVerification.error;
      toast.error(intlBankVerification.error);
    }
  }, [intlBankVerification.error, intlBankVerification.isVerifying]);

  // Comprehensive list of Nigerian commercial banks
  const nigerianBanks = [
    // Tier 1 Commercial Banks
    { code: '044', name: 'Access Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
    { code: '033', name: 'United Bank for Africa (UBA)' },
    { code: '057', name: 'Zenith Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '014', name: 'MainStreet Bank' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '068', name: 'Sterling Bank' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '032', name: 'Union Bank of Nigeria' },
    { code: '035', name: 'Wema Bank' },
    { code: '076', name: 'Polaris Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '030', name: 'Heritage Bank' },
    { code: '215', name: 'Unity Bank' },

    // Regional and Specialized Banks
    { code: '090', name: 'Jaiz Bank' },
    { code: '301', name: 'TAJ Bank' },
    { code: '501', name: 'Providus Bank' },
    { code: '232', name: 'Sterling Bank' },
    { code: '101', name: 'ProvidusBank' },
    { code: '100', name: 'Suntrust Bank' },
    { code: '304', name: 'Stanbic IBTC @ease' },
    { code: '401', name: 'ASO Savings and Loans' },
    { code: '307', name: 'EcoMobile' },
    { code: '309', name: 'FBN Mobile' },

    // Digital Banks
    { code: '565', name: 'Carbon (formerly Paylater)' },
    { code: '801', name: 'Kuda Bank' },
    { code: '737', name: 'Opay' },
    { code: '999', name: 'PalmPay' },
    { code: '103', name: 'Sparkle Bank' },
    { code: '50211', name: 'Kuda Microfinance Bank' },
    { code: '90067', name: 'Renmoney MFB' },
    { code: '50515', name: 'Moniepoint MFB' },

    // Microfinance Banks
    { code: '090175', name: 'Rubies MFB' },
    { code: '070008', name: 'Opay Digital Services Limited (OPay)' },
    { code: '120001', name: 'Accelerex Network Limited' },
    { code: '090171', name: 'Ohafia Microfinance Bank' },
    { code: '090259', name: 'Alekun Microfinance Bank' },
    { code: '090117', name: 'Patrickgold Microfinance Bank' }
  ];

  const internationalCurrencies = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'GBP', name: 'British Pound', flag: '��' },
    { code: 'EUR', name: 'Euro', flag: '��' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
    { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
    { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
    { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭' }
  ];

  const hasWalletForCurrency = (code: string) =>
    wallets.some((wallet) => wallet.currency === code);

  const ngnWallet = wallets.find((wallet) => wallet.currency === 'NGN');

  const intlWallet = wallets.find((wallet) => wallet.currency === paymentData.currency);

  // Nigerian merchant categories and merchants
  const merchantCategories = [
    {
      id: 'ecommerce',
      name: 'E-Commerce',
      icon: ShoppingCart,
      merchants: [
        { code: 'JUMIA', name: 'Jumia', description: 'Online marketplace' },
        { code: 'KONGA', name: 'Konga', description: 'Online retail store' },
        { code: 'JIJI', name: 'Jiji', description: 'Classified marketplace' },
        { code: 'SLOT', name: 'SLOT Systems', description: 'Electronics retailer' },
        { code: 'SHOPRITE', name: 'Shoprite', description: 'Supermarket chain' },
        { code: 'SPAR', name: 'SPAR', description: 'Retail chain' }
      ]
    },
    {
      id: 'utilities',
      name: 'Utilities',
      icon: Zap,
      merchants: [
        { code: 'EKEDC', name: 'Eko Electricity Distribution Company', description: 'Electricity bills' },
        { code: 'IKEDC', name: 'Ikeja Electric', description: 'Electricity bills' },
        { code: 'PHED', name: 'Port Harcourt Electric', description: 'Electricity bills' },
        { code: 'KEDCO', name: 'Kano Electricity Distribution', description: 'Electricity bills' },
        { code: 'AEDC', name: 'Abuja Electricity Distribution Company', description: 'Electricity bills' },
        { code: 'WATER_LAGOS', name: 'Lagos Water Corporation', description: 'Water bills' },
        { code: 'WASTE_MGT', name: 'Lagos Waste Management Authority', description: 'Waste management' }
      ]
    },
    {
      id: 'telecom',
      name: 'Telecom & Internet',
      icon: Phone,
      merchants: [
        { code: 'MTN', name: 'MTN Nigeria', description: 'Mobile network operator' },
        { code: 'AIRTEL', name: 'Airtel Nigeria', description: 'Mobile network operator' },
        { code: 'GLO', name: 'Globacom', description: 'Mobile network operator' },
        { code: '9MOBILE', name: '9mobile', description: 'Mobile network operator' },
        { code: 'SPECTRANET', name: 'Spectranet', description: 'Internet service provider' },
        { code: 'SWIFT', name: 'Swift Networks', description: 'Internet service provider' },
        { code: 'SMILE', name: 'Smile Communications', description: 'Internet service provider' }
      ]
    },
    {
      id: 'transport',
      name: 'Transportation',
      icon: Car,
      merchants: [
        { code: 'UBER', name: 'Uber Nigeria', description: 'Ride-hailing service' },
        { code: 'BOLT', name: 'Bolt (formerly Taxify)', description: 'Ride-hailing service' },
        { code: 'INDRIVER', name: 'inDriver', description: 'Ride-hailing service' },
        { code: 'GOKADA', name: 'Gokada', description: 'Logistics and delivery' },
        { code: 'MAX', name: 'MAX.ng', description: 'Bike-hailing service' },
        { code: 'LAGBUS', name: 'Lagos Bus Service (LAGBUS)', description: 'Public transportation' }
      ]
    },
    {
      id: 'education',
      name: 'Education',
      icon: GraduationCap,
      merchants: [
        { code: 'UNILAG', name: 'University of Lagos', description: 'Federal university' },
        { code: 'UI', name: 'University of Ibadan', description: 'Federal university' },
        { code: 'COVENANT', name: 'Covenant University', description: 'Private university' },
        { code: 'BABCOCK', name: 'Babcock University', description: 'Private university' },
        { code: 'WAEC', name: 'West African Examinations Council', description: 'Examination body' },
        { code: 'NECO', name: 'National Examinations Council', description: 'Examination body' },
        { code: 'JAMB', name: 'Joint Admissions and Matriculation Board', description: 'University admissions' }
      ]
    },
    {
      id: 'entertainment',
      name: 'Entertainment & Media',
      icon: Tv,
      merchants: [
        { code: 'DSTV', name: 'DStv', description: 'Satellite TV subscription' },
        { code: 'GOTV', name: 'GOtv', description: 'Digital TV subscription' },
        { code: 'STARTIMES', name: 'StarTimes', description: 'Digital TV subscription' },
        { code: 'NETFLIX', name: 'Netflix Nigeria', description: 'Streaming service' },
        { code: 'SPOTIFY', name: 'Spotify Nigeria', description: 'Music streaming' },
        { code: 'SHOWMAX', name: 'Showmax', description: 'Video streaming' }
      ]
    },
    {
      id: 'travel',
      name: 'Travel & Tourism',
      icon: Plane,
      merchants: [
        { code: 'ARIK', name: 'Arik Air', description: 'Domestic airline' },
        { code: 'DANA', name: 'Dana Air', description: 'Domestic airline' },
        { code: 'AZMAN', name: 'Azman Air', description: 'Domestic airline' },
        { code: 'HOTELS_NG', name: 'Hotels.ng', description: 'Hotel booking platform' },
        { code: 'TRAVELSTART', name: 'Travelstart Nigeria', description: 'Travel booking platform' },
        { code: 'WAKANOW', name: 'Wakanow', description: 'Travel agency' }
      ]
    }
  ];

  const recentRecipients = [
    { name: 'John Doe', account: '1234567890', bank: 'GTBank', type: 'bank' },
    { name: 'Jane Smith', account: '0987654321', bank: 'Access Bank', type: 'bank' },
    { name: 'Mike Johnson', account: '1122334455', bank: 'Zenith Bank', type: 'bank' },
    { name: 'MTN Nigeria', code: 'MTN', type: 'merchant', category: 'Telecom' },
    { name: 'Ikeja Electric', code: 'IKEDC', type: 'merchant', category: 'Utilities' }
  ] as Recipient[];

  // Filter merchants based on search and category
  const filteredMerchants = merchantCategories
    .filter(cat => !selectedMerchantCategory || cat.id === selectedMerchantCategory)
    .flatMap(cat => cat.merchants.map(merchant => ({ ...merchant, category: cat.name, categoryIcon: cat.icon })))
    .filter(merchant =>
      merchantSearch === '' ||
      merchant.name.toLowerCase().includes(merchantSearch.toLowerCase()) ||
      merchant.description.toLowerCase().includes(merchantSearch.toLowerCase())
    );

  const handleSendPayment = async () => {
    if (isSending) return;

    if (!paymentData.amount || Number(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (recipientType !== 'bank') {
      toast.error('Only direct bank transfers are wired to the ledger for now');
      return;
    }

    if (!paymentData.accountNumber) {
      toast.error(
        activeTab === 'local'
          ? 'Please enter an account number'
          : 'Please enter an IBAN / account number'
      );
      return;
    }

    if (activeTab === 'local' && !paymentData.bankCode) {
      toast.error('Please select a bank');
      return;
    }

    if (
      activeTab === 'international' &&
      !internationalCurrencies.some((c) => c.code === paymentData.currency)
    ) {
      toast.error('Please select a currency for the international transfer');
      return;
    }

    const transferCurrency =
      activeTab === 'local' ? 'NGN' : paymentData.currency || 'NGN';

    const sourceWallet = wallets.find((wallet) => wallet.currency === transferCurrency);

    if (!sourceWallet) {
      toast.error(
        activeTab === 'local'
          ? 'You do not have an NGN account yet. Please open one from the Accounts page.'
          : `You do not have a ${transferCurrency} account yet. Please open one from the Accounts page.`
      );
      return;
    }

    setIsSending(true);
    try {
      if (isOffline) {
        // Queue the request
        const transferCurrency = activeTab === 'local' ? 'NGN' : paymentData.currency || 'NGN';
        const recipientBankCode = activeTab === 'local' ? paymentData.bankCode : 'INTL';
        const verification = activeTab === 'local' ? localBankVerification.verification : intlBankVerification.verification;
        const recipientName = verification?.data?.accountName || paymentData.recipient;

        const requestData = {
          amount: paymentData.amount,
          currency: transferCurrency,
          recipientAccountNumber: paymentData.accountNumber,
          recipientBankCode,
          recipientName: recipientName || undefined,
          reference: paymentData.customerReference || undefined,
          description: paymentData.description || undefined,
        };

        await offlineQueue.addToQueue('/api/ledger/transfer', 'POST', requestData); // Note: Assuming total path here, verify if necessary

        toast.warning('Transaction Queued', {
          description: 'You are offline. This payment will be sent automatically when you reconnect.',
        });
        setIsSending(false);
        return;
      }

      const verification =
        activeTab === 'local'
          ? localBankVerification.verification
          : intlBankVerification.verification;

      const verifiedName = verification?.data?.accountName;
      const recipientName = verifiedName || paymentData.recipient;

      const recipientBankCode =
        activeTab === 'local'
          ? paymentData.bankCode
          : 'INTL';

      const response = await performBankTransfer({
        amount: paymentData.amount,
        currency: transferCurrency,
        recipientAccountNumber: paymentData.accountNumber,
        recipientBankCode,
        recipientName: recipientName || undefined,
        reference: paymentData.customerReference || undefined,
        description: paymentData.description || undefined,
      });

      if (response.success && response.data?.success) {
        toast.success('Transfer completed successfully');
      } else {
        toast.error(response.message || 'Transfer failed');
      }
    } catch (error: unknown) {
      const apiMessage = (error as ApiError).response?.data?.message || (error as ApiError).response?.data?.error;
      toast.error(apiMessage || 'An error occurred while processing the transfer');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSmsFallback = (data: any) => {
    const phoneNumber = '0800796729'; // SznPay SMS Gateway Placeholder
    const body = `PAY ${data.amount} ${data.recipientAccountNumber} ${data.recipientBankCode}`;
    window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(body)}`;
    toast.info('SMS App Opened', {
      description: 'Please send the pre-filled message to complete your transaction via SMS.'
    });
  };

  const handleRecipientSelect = (recipient: Recipient) => {
    if (recipient.type === 'bank') {
      setRecipientType('bank');
      setPaymentData({
        ...paymentData,
        recipient: recipient.name,
        accountNumber: recipient.account,
        bankCode: recipient.bank === 'GTBank' ? '058' : recipient.bank === 'Access Bank' ? '044' : '057'
      });
    } else {
      setRecipientType('merchant');
      setPaymentData({
        ...paymentData,
        recipient: recipient.name,
        merchantCode: recipient.code,
        merchantId: recipient.code
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10">
        <Navbar currentPage="payments" onNavigate={onNavigate} user={user} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Send Money</h1>
            <p className="text-gray-300">Transfer money locally in Nigeria or internationally</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-white/10">
                      <TabsTrigger value="local" className="data-[state=active]:bg-white/20 flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        <span className="text-xs">Local (NGN)</span>
                      </TabsTrigger>
                      <TabsTrigger value="international" className="data-[state=active]:bg-white/20 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span className="text-xs">International</span>
                      </TabsTrigger>
                      <TabsTrigger value="sms" className="data-[state=active]:bg-white/20 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs">SMS Fallback</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="local" className="space-y-6 mt-6">
                      {walletsLoading ? (
                        <div className="text-xs text-gray-400">Loading accounts...</div>
                      ) : ngnWallet ? (
                        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-200 gap-1">
                          <span className="font-medium text-white">From Naira account</span>
                          <span className="font-mono text-gray-100">{ngnWallet.account_number}</span>
                          <span className="text-gray-300">
                            Balance:{' '}
                            {new Intl.NumberFormat('en-NG', {
                              style: 'currency',
                              currency: 'NGN',
                              minimumFractionDigits: 0,
                            }).format(Number(ngnWallet.available_balance || ngnWallet.balance || '0'))}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                          No NGN account yet. Open one from the Accounts page.
                        </div>
                      )}

                      {/* Recipient Type Selection */}
                      <div className="space-y-3">
                        <Label className="text-white">Send To</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            type="button"
                            variant={recipientType === 'bank' ? 'default' : 'outline'}
                            className={`h-16 flex-col space-y-2 ${recipientType === 'bank' ? 'bg-gradient-to-r from-green-500 to-blue-600' : 'border-white/20 text-white hover:bg-white/10'}`}
                            onClick={() => setRecipientType('bank')}
                          >
                            <Building2 className="h-6 w-6" />
                            <span>Bank Account</span>
                          </Button>
                          <Button
                            type="button"
                            variant={recipientType === 'merchant' ? 'default' : 'outline'}
                            className={`h-16 flex-col space-y-2 ${recipientType === 'merchant' ? 'bg-gradient-to-r from-green-500 to-blue-600' : 'border-white/20 text-white hover:bg-white/10'}`}
                            onClick={() => setRecipientType('merchant')}
                          >
                            <Store className="h-6 w-6" />
                            <span>Merchant/Biller</span>
                          </Button>
                        </div>
                      </div>

                      {walletsLoading ? (
                        <div className="text-xs text-gray-400">Loading accounts...</div>
                      ) : intlWallet ? (
                        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-200 gap-1">
                          <span className="font-medium text-white">From {intlWallet.currency} account</span>
                          <span className="font-mono text-gray-100">{intlWallet.account_number}</span>
                          <span className="text-gray-300">
                            Balance:{' '}
                            {new Intl.NumberFormat('en-NG', {
                              style: 'currency',
                              currency: intlWallet.currency,
                              minimumFractionDigits: 0,
                            }).format(Number(intlWallet.available_balance || intlWallet.balance || '0'))}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                          Select a currency that you have an account for to continue.
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-white">Amount (NGN)</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-lg font-semibold"
                          />
                        </div>
                        {recipientType === 'bank' && (
                          <div className="space-y-2">
                            <Label htmlFor="bank" className="text-white">Bank</Label>
                            <Select value={paymentData.bankCode} onValueChange={(value) => setPaymentData({ ...paymentData, bankCode: value })}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="Select bank" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-white/20 max-h-64">
                                {nigerianBanks.map((bank) => (
                                  <SelectItem key={bank.code} value={bank.code} className="text-white hover:bg-white/10">
                                    {bank.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {recipientType === 'merchant' && (
                          <div className="space-y-2">
                            <Label className="text-white">Merchant Category</Label>
                            <Select value={selectedMerchantCategory} onValueChange={setSelectedMerchantCategory}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="All categories" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-white/20">
                                <SelectItem value="" className="text-white hover:bg-white/10">All Categories</SelectItem>
                                {merchantCategories.map((category) => {
                                  const Icon = category.icon;
                                  return (
                                    <SelectItem key={category.id} value={category.id} className="text-white hover:bg-white/10">
                                      <div className="flex items-center">
                                        <Icon className="mr-2 h-4 w-4" />
                                        {category.name}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {recipientType === 'merchant' && (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search merchants..."
                              value={merchantSearch}
                              onChange={(e) => setMerchantSearch(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-2 border border-white/20 rounded-md p-2 bg-white/5">
                            {filteredMerchants.map((merchant) => {
                              const Icon = merchant.categoryIcon;
                              return (
                                <div
                                  key={merchant.code}
                                  className="p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                                  onClick={() => {
                                    setPaymentData({
                                      ...paymentData,
                                      recipient: merchant.name,
                                      merchantCode: merchant.code,
                                      merchantId: merchant.code
                                    });
                                  }}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Icon className="h-5 w-5 text-blue-400" />
                                    <div className="flex-1">
                                      <p className="text-white font-medium">{merchant.name}</p>
                                      <p className="text-gray-400 text-sm">{merchant.description}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs text-gray-300 border-gray-600">
                                      {merchant.category}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {paymentData.recipient && (
                        <Alert className="bg-green-500/10 border-green-500/20">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <AlertDescription className="text-green-300">
                            {recipientType === 'bank' ? 'Bank transfer' : 'Merchant payment'} to: <strong>{paymentData.recipient}</strong>
                          </AlertDescription>
                        </Alert>
                      )}

                      {recipientType === 'bank' && (
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="accountNumber" className="text-white flex items-center space-x-2">
                                <span>Account Number</span>
                                <BankVerificationIndicator
                                  verification={localBankVerification.verification}
                                  isVerifying={localBankVerification.isVerifying}
                                  error={localBankVerification.error}
                                />
                              </Label>
                              <Input
                                id="accountNumber"
                                placeholder="1234567890"
                                value={paymentData.accountNumber}
                                onChange={(e) => {
                                  setPaymentData({ ...paymentData, accountNumber: e.target.value });
                                  // Clear recipient name if account number changes
                                  if (e.target.value !== paymentData.accountNumber) {
                                    setPaymentData(prev => ({ ...prev, accountNumber: e.target.value, recipient: '' }));
                                  }
                                }}
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                maxLength={10}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="recipient" className="text-white">Account Holder Name</Label>
                              <Input
                                id="recipient"
                                placeholder={localBankVerification.verification?.data?.accountName || "Auto-filled after verification"}
                                value={localBankVerification.verification?.data?.accountName || paymentData.recipient}
                                onChange={(e) => setPaymentData({ ...paymentData, recipient: e.target.value })}
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                readOnly={!!localBankVerification.verification?.data?.accountName}
                              />
                            </div>
                          </div>

                          {/* Bank Verification Status */}
                          <BankVerificationStatus
                            verification={localBankVerification.verification}
                            isVerifying={localBankVerification.isVerifying}
                            error={localBankVerification.error}
                            onRetry={() => localBankVerification.verifyAccount(
                              paymentData.accountNumber,
                              paymentData.bankCode,
                              false,
                              'NG'
                            )}
                            onClear={() => localBankVerification.clearVerification()}
                            compact={true}
                          />
                        </div>
                      )}

                      {recipientType === 'merchant' && paymentData.merchantCode && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="customerReference" className="text-white">Customer Reference</Label>
                            <Input
                              id="customerReference"
                              placeholder="Phone number, customer ID, or account number"
                              value={paymentData.customerReference}
                              onChange={(e) => setPaymentData({ ...paymentData, customerReference: e.target.value })}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            />
                            <p className="text-xs text-gray-400">
                              {paymentData.merchantCode?.includes('MTN') || paymentData.merchantCode?.includes('AIRTEL') || paymentData.merchantCode?.includes('GLO') || paymentData.merchantCode?.includes('9MOBILE')
                                ? 'Enter your phone number (e.g., 08012345678)'
                                : paymentData.merchantCode?.includes('DSTV') || paymentData.merchantCode?.includes('GOTV') || paymentData.merchantCode?.includes('STARTIMES')
                                  ? 'Enter your smartcard number or IUC number'
                                  : paymentData.merchantCode?.includes('EKEDC') || paymentData.merchantCode?.includes('IKEDC') || paymentData.merchantCode?.includes('PHED')
                                    ? 'Enter your meter number'
                                    : 'Enter customer reference number'}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          placeholder="What's this payment for?"
                          value={paymentData.description}
                          onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="international" className="space-y-6 mt-6">
                      <Alert className="bg-blue-500/10 border-blue-500/20">
                        <Globe className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300">
                          International transfers may take 1-3 business days to complete
                        </AlertDescription>
                      </Alert>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="intAmount" className="text-white">Amount</Label>
                          <Input
                            id="intAmount"
                            type="number"
                            placeholder="0.00"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-lg font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency" className="text-white">Currency</Label>
                          <Select
                            value={paymentData.currency}
                            onValueChange={(value) => setPaymentData({ ...paymentData, currency: value })}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-white/20">
                              {internationalCurrencies.map((currency) => {
                                const hasWallet = hasWalletForCurrency(currency.code);
                                return (
                                  <SelectItem
                                    key={currency.code}
                                    value={currency.code}
                                    disabled={!hasWallet}
                                    className={`flex items-center justify-between text-white hover:bg-white/10 ${!hasWallet ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                  >
                                    <span>
                                      {currency.flag} {currency.name} ({currency.code})
                                    </span>
                                    {!hasWallet && (
                                      <span className="text-xs text-red-300 ml-2">
                                        No account
                                      </span>
                                    )}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="intRecipient" className="text-white">Recipient Details</Label>
                        <Input
                          id="intRecipient"
                          placeholder={intlBankVerification.verification?.data?.accountName || "Full name as on bank account"}
                          value={intlBankVerification.verification?.data?.accountName || paymentData.recipient}
                          onChange={(e) => setPaymentData({ ...paymentData, recipient: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          readOnly={!!intlBankVerification.verification?.data?.accountName}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="intAccount" className="text-white flex items-center space-x-2">
                          <span>IBAN / Account Number</span>
                          <BankVerificationIndicator
                            verification={intlBankVerification.verification}
                            isVerifying={intlBankVerification.isVerifying}
                            error={intlBankVerification.error}
                          />
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            id="intAccount"
                            placeholder="International bank account number or IBAN"
                            value={paymentData.accountNumber}
                            onChange={(e) => {
                              setPaymentData({ ...paymentData, accountNumber: e.target.value });
                              intlBankVerification.clearVerification();
                            }}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => intlBankVerification.verifyAccount(
                              paymentData.accountNumber,
                              undefined,
                              true,
                              paymentData.currency === 'USD' ? 'US' : paymentData.currency === 'EUR' ? 'DE' : 'GB'
                            )}
                            disabled={!paymentData.accountNumber || paymentData.accountNumber.length < 8 || intlBankVerification.isVerifying}
                            className="border-white/20 text-white hover:bg-white/10 min-w-[80px]"
                          >
                            {intlBankVerification.isVerifying ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* International Bank Verification Status */}
                      <BankVerificationStatus
                        verification={intlBankVerification.verification}
                        isVerifying={intlBankVerification.isVerifying}
                        error={intlBankVerification.error}
                        onRetry={() => intlBankVerification.verifyAccount(
                          paymentData.accountNumber,
                          undefined,
                          true,
                          paymentData.currency === 'USD' ? 'US' : paymentData.currency === 'EUR' ? 'DE' : 'GB'
                        )}
                        onClear={() => intlBankVerification.clearVerification()}
                        compact={false}
                      />
                    </TabsContent>

                    <TabsContent value="sms" className="mt-6">
                      <SMSFallback isOffline={isOffline} />
                    </TabsContent>
                  </Tabs>

                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button
                      className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                      onClick={handleSendPayment}
                      disabled={
                        isSending ||
                        walletsLoading ||
                        (activeTab === 'local' ? !ngnWallet : !intlWallet)
                      }
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Payment
                    </Button>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <QrCode className="mr-2 h-4 w-4" />
                      Scan QR Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Contact className="mr-2 h-5 w-5" />
                    Recent Recipients
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentRecipients.map((recipient, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => handleRecipientSelect(recipient)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {recipient.type === 'bank' ? (
                            <Building2 className="h-5 w-5 text-blue-400" />
                          ) : (
                            <Store className="h-5 w-5 text-green-400" />
                          )}
                          <div>
                            <p className="text-white font-medium">{recipient.name}</p>
                            <p className="text-gray-400 text-sm">
                              {recipient.type === 'bank' ? recipient.bank : recipient.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${recipient.type === 'bank' ? 'text-blue-300 border-blue-600' : 'text-green-300 border-green-600'}`}
                          >
                            {recipient.type === 'bank' ? 'Bank' : 'Merchant'}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-blue-600/10 backdrop-blur-md border-green-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Instant Transfers</p>
                      <p className="text-gray-300 text-sm">Bank transfers and bill payments complete instantly</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Store className="h-6 w-6 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">Merchant Payments</p>
                      <p className="text-gray-300 text-sm">Pay bills, buy airtime, and shop online</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">24/7 Available</p>
                      <p className="text-gray-300 text-sm">Send money anytime, anywhere</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Supported Banks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-300">
                    <p className="mb-2">We support all major Nigerian banks:</p>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div>• All Tier 1 Commercial Banks (GTBank, Access, UBA, etc.)</div>
                      <div>• Digital Banks (Kuda, Opay, PalmPay)</div>
                      <div>• Microfinance Banks</div>
                      <div>• {nigerianBanks.length}+ banks total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Store className="mr-2 h-5 w-5" />
                    Merchant Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {merchantCategories.slice(0, 4).map((category) => {
                      const Icon = category.icon;
                      return (
                        <div key={category.id} className="flex items-center space-x-2 text-sm">
                          <Icon className="h-4 w-4 text-blue-400" />
                          <span className="text-white">{category.name}</span>
                          <span className="text-gray-400">({category.merchants.length})</span>
                        </div>
                      );
                    })}
                    <p className="text-xs text-gray-400 mt-2">
                      + {merchantCategories.length - 4} more categories with {merchantCategories.reduce((acc, cat) => acc + cat.merchants.length, 0)} merchants
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
