import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  Lock, 
  Unlock,
  ShoppingCart,
  Globe,
  Smartphone
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { VirtualCard } from '@/lib/types';
import {
  openUserLedgerAccount,
  getUserLedgerAccounts,
  type LedgerAccount,
} from '@/lib/api';
import { toast } from 'sonner';

interface VirtualCardsProps {
  onNavigate: (page: string) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function VirtualCards({ onNavigate, user }: VirtualCardsProps) {
  const [showCardDetails, setShowCardDetails] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCard, setNewCard] = useState({
    cardType: '',
    nickname: '',
    initialBalance: '',
    currency: 'NGN'
  });

  const [ledgerCards, setLedgerCards] = useState<VirtualCard[]>([]);

  const virtualCards: VirtualCard[] = [
    {
      id: '1',
      userId: '1',
      cardNumber: '4532 1234 5678 9012',
      expiryDate: '12/27',
      cvv: '123',
      cardType: 'visa',
      status: 'active',
      balance: 150000,
      currency: 'NGN',
      nickname: 'Online Shopping',
      createdAt: new Date()
    },
    {
      id: '2',
      userId: '1',
      cardNumber: '5555 4444 3333 2222',
      expiryDate: '08/26',
      cvv: '456',
      cardType: 'mastercard',
      status: 'active',
      balance: 75000,
      currency: 'NGN',
      nickname: 'Subscriptions',
      createdAt: new Date()
    },
    {
      id: '3',
      userId: '1',
      cardNumber: '5061 2345 6789 0123',
      expiryDate: '03/28',
      cvv: '789',
      cardType: 'verve',
      status: 'blocked',
      balance: 0,
      currency: 'NGN',
      nickname: 'Travel Card',
      createdAt: new Date()
    }
  ];

  const buildLedgerCardFromAccount = (account: LedgerAccount): VirtualCard => {
    const last4 = account.account_number?.slice(-4) || '0000';
    const maskedNumber = `•••• •••• •••• ${last4}`;

    return {
      id: `acct-${account.id}`,
      userId: 'ledger',
      cardNumber: maskedNumber,
      expiryDate: '12/28',
      cvv: '000',
      cardType: 'visa',
      status: 'active',
      balance: Number(account.balance || account.available_balance || '0'),
      currency: account.currency,
      nickname: `${account.currency} Online Card`,
      createdAt: new Date(),
    };
  };

  const loadLedgerCards = async () => {
    try {
      const accounts = await getUserLedgerAccounts();
      const cards = (accounts || []).map(buildLedgerCardFromAccount);
      setLedgerCards(cards);
    } catch (err) {
      console.error('Failed to load accounts for virtual cards', err);
    }
  };

  useEffect(() => {
    loadLedgerCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefer real ledger-backed cards when available; fall back to demo cards otherwise
  const allCards: VirtualCard[] = ledgerCards.length > 0 ? ledgerCards : virtualCards;

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    });
    return formatter.format(amount);
  };

  const getCardColor = (cardType: string) => {
    switch (cardType) {
      case 'visa':
        return 'from-blue-600 to-blue-800';
      case 'mastercard':
        return 'from-red-600 to-red-800';
      case 'verve':
        return 'from-green-600 to-green-800';
      default:
        return 'from-gray-600 to-gray-800';
    }
  };

  const getCardLogo = (cardType: string) => {
    switch (cardType) {
      case 'visa':
        return 'VISA';
      case 'mastercard':
        return 'Mastercard';
      case 'verve':
        return 'VERVE';
      default:
        return 'CARD';
    }
  };

  const handleCreateCard = async () => {
    if (!newCard.cardType || !newCard.currency) {
      toast.error('Please select a card type and currency');
      return;
    }

    try {
      const currency = newCard.currency;

      // Enforce one virtual card per currency (including NGN)
      if (ledgerCards.some((card) => card.currency === currency)) {
        toast.error(`You already have a ${currency} virtual card`);
        return;
      }

      const account = await openUserLedgerAccount(currency, `${currency} Card Account`);
      setLedgerCards((prev) => {
        const id = `acct-${account.id}`;
        if (prev.some((card) => card.id === id)) {
          return prev;
        }
        return [...prev, buildLedgerCardFromAccount(account)];
      });

      toast.success(
        currency === 'NGN'
          ? 'Naira card created successfully'
          : `${currency} account is ready and linked to your virtual card`
      );
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
      toast.error(apiMessage || 'Could not prepare the linked account for this card');
    } finally {
      setIsCreateDialogOpen(false);
      setNewCard({ cardType: '', nickname: '', initialBalance: '', currency: 'NGN' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
        <Navbar currentPage="cards" onNavigate={onNavigate} user={user} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Virtual Cards</h1>
              <p className="text-gray-300">Manage your Verve, Visa, and Mastercard virtual cards</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Card
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle>Create Virtual Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardType">Card Type</Label>
                    <Select value={newCard.cardType} onValueChange={(value) => setNewCard({...newCard, cardType: value})}>
                      <SelectTrigger className="bg-white/10 border-white/20">
                        <SelectValue placeholder="Select card type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-white/20">
                        <SelectItem value="visa">Visa</SelectItem>
                        <SelectItem value="mastercard">Mastercard</SelectItem>
                        <SelectItem value="verve">Verve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={newCard.currency}
                      onValueChange={(value) => setNewCard({ ...newCard, currency: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-white/20">
                        <SelectItem
                          value="NGN"
                          disabled={ledgerCards.some((card) => card.currency === 'NGN')}
                        >
                          Naira (NGN)
                        </SelectItem>
                        <SelectItem
                          value="USD"
                          disabled={ledgerCards.some((card) => card.currency === 'USD')}
                        >
                          US Dollar (USD)
                        </SelectItem>
                        <SelectItem
                          value="GBP"
                          disabled={ledgerCards.some((card) => card.currency === 'GBP')}
                        >
                          British Pound (GBP)
                        </SelectItem>
                        <SelectItem
                          value="EUR"
                          disabled={ledgerCards.some((card) => card.currency === 'EUR')}
                        >
                          Euro (EUR)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Card Nickname</Label>
                    <Input
                      id="nickname"
                      placeholder="e.g., Online Shopping"
                      value={newCard.nickname}
                      onChange={(e) => setNewCard({...newCard, nickname: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="initialBalance">Initial Balance ({newCard.currency || 'NGN'})</Label>
                    <Input
                      id="initialBalance"
                      type="number"
                      placeholder="50000"
                      value={newCard.initialBalance}
                      onChange={(e) => setNewCard({...newCard, initialBalance: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCreateCard}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  >
                    Create Card
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCards.map((card) => (
              <Card key={card.id} className="bg-white/5 backdrop-blur-md border-white/20 overflow-hidden">
                <CardContent className="p-0">
                  {/* Card Visual */}
                  <div className={`relative h-48 bg-gradient-to-br ${getCardColor(card.cardType)} p-6 text-white`}>
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-sm opacity-80">{card.nickname}</p>
                        <Badge 
                          className={`mt-1 ${
                            card.status === 'active' 
                              ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}
                        >
                          {card.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{getCardLogo(card.cardType)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-mono tracking-wider">
                          {showCardDetails === card.id ? card.cardNumber : '•••• •••• •••• ••••'}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs opacity-80">EXPIRES</p>
                          <p className="font-mono">
                            {showCardDetails === card.id ? card.expiryDate : '••/••'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs opacity-80">CVV</p>
                          <p className="font-mono">
                            {showCardDetails === card.id ? card.cvv : '•••'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Details */}
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-400 text-sm">Balance</p>
                        <p className="text-white font-semibold text-lg">
                          {formatCurrency(card.balance, card.currency)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCardDetails(
                          showCardDetails === card.id ? null : card.id
                        )}
                        className="text-gray-400 hover:text-white"
                      >
                        {showCardDetails === card.id ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-white/20 text-white hover:bg-white/10"
                        onClick={() => copyToClipboard(card.cardNumber)}
                      >
                        <Copy className="mr-2 h-3 w-3" />
                        Copy
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {card.status === 'active' ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage Stats */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-md border-blue-500/20">
              <CardContent className="p-6 text-center">
                <ShoppingCart className="h-8 w-8 text-blue-400 mx-auto mb-4" />
                <p className="text-2xl font-bold text-white mb-2">₦425,000</p>
                <p className="text-blue-300 text-sm">Total Spent This Month</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-md border-green-500/20">
              <CardContent className="p-6 text-center">
                <Globe className="h-8 w-8 text-green-400 mx-auto mb-4" />
                <p className="text-2xl font-bold text-white mb-2">47</p>
                <p className="text-green-300 text-sm">International Transactions</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-md border-purple-500/20">
              <CardContent className="p-6 text-center">
                <Smartphone className="h-8 w-8 text-purple-400 mx-auto mb-4" />
                <p className="text-2xl font-bold text-white mb-2">156</p>
                <p className="text-purple-300 text-sm">Mobile Payments</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}