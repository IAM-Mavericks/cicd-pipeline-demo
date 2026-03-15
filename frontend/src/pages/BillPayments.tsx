import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Zap, 
  Tv, 
  Smartphone, 
  Wifi, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from 'lucide-react';

interface VerifiedCustomer {
  customerName: string;
  address?: string;
  meterNumber?: string;
  accountType?: string;
  smartcardNumber?: string;
  currentPackage?: string;
  status?: string;
}

interface DataPlan {
  id: string;
  name: string;
  size: string;
  validity: string;
  price: number;
}

interface BillPaymentsProps {
  onNavigate: (page: string) => void;
}

const BillPayments = ({ onNavigate }: BillPaymentsProps) => {
  const [activeTab, setActiveTab] = useState('electricity');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [customerVerified, setCustomerVerified] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<VerifiedCustomer | null>(null);

  // Electricity form state
  const [electricityForm, setElectricityForm] = useState({
    disco: '',
    meterNumber: '',
    amount: '',
    email: '',
    phoneNumber: ''
  });

  // Cable TV form state
  const [cableTVForm, setCableTVForm] = useState({
    provider: '',
    smartcardNumber: '',
    package: '',
    amount: '',
    email: '',
    phoneNumber: ''
  });

  // Airtime form state
  const [airtimeForm, setAirtimeForm] = useState({
    network: '',
    phoneNumber: '',
    amount: ''
  });

  // Data form state
  const [dataForm, setDataForm] = useState({
    network: '',
    phoneNumber: '',
    plan: '',
    amount: ''
  });

  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);

  // Verify customer (meter number or smartcard)
  const verifyCustomer = async (type: string, identifier: string, billerId: string) => {
    if (!identifier) {
      toast.error('Please enter the required identifier');
      return;
    }

    setVerifying(true);
    try {
      // Mock verification - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockData = {
        electricity: {
          customerName: 'John Doe',
          address: '123 Lagos Street, Ikeja',
          meterNumber: identifier,
          accountType: 'Prepaid'
        },
        cable_tv: {
          customerName: 'Jane Smith',
          smartcardNumber: identifier,
          currentPackage: 'DSTV Compact',
          status: 'Active'
        }
      };

      setCustomerDetails(mockData[type as keyof typeof mockData] as VerifiedCustomer);
      setCustomerVerified(true);
      toast.success('Customer verified successfully');
    } catch (error) {
      toast.error('Verification failed. Please check the details and try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Handle electricity purchase
  const handleElectricityPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerVerified) {
      toast.error('Please verify customer details first');
      return;
    }

    setLoading(true);
    try {
      // Mock purchase - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const token = '1234-5678-9012-3456-7890';
      
      toast.success(
        <div className="space-y-2">
          <p className="font-semibold">Electricity purchased successfully!</p>
          <p className="text-sm">Token: {token}</p>
          <p className="text-xs text-muted-foreground">Units: {(parseFloat(electricityForm.amount) / 50).toFixed(2)} kWh</p>
        </div>,
        { duration: 10000 }
      );

      // Reset form
      setElectricityForm({
        disco: '',
        meterNumber: '',
        amount: '',
        email: '',
        phoneNumber: ''
      });
      setCustomerVerified(false);
      setCustomerDetails(null);
    } catch (error) {
      toast.error('Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cable TV purchase
  const handleCableTVPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerVerified) {
      toast.error('Please verify customer details first');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(
        <div className="space-y-2">
          <p className="font-semibold">Subscription successful!</p>
          <p className="text-sm">{cableTVForm.provider} {cableTVForm.package}</p>
          <p className="text-xs text-muted-foreground">Valid for 30 days</p>
        </div>,
        { duration: 5000 }
      );

      setCableTVForm({
        provider: '',
        smartcardNumber: '',
        package: '',
        amount: '',
        email: '',
        phoneNumber: ''
      });
      setCustomerVerified(false);
      setCustomerDetails(null);
    } catch (error) {
      toast.error('Subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle airtime purchase
  const handleAirtimePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`₦${airtimeForm.amount} airtime sent to ${airtimeForm.phoneNumber}`);
      
      setAirtimeForm({
        network: '',
        phoneNumber: '',
        amount: ''
      });
    } catch (error) {
      toast.error('Airtime purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle data purchase
  const handleDataPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const selectedPlan = dataPlans.find(p => p.id === dataForm.plan);
      toast.success(`${selectedPlan?.name} sent to ${dataForm.phoneNumber}`);
      
      setDataForm({
        network: '',
        phoneNumber: '',
        plan: '',
        amount: ''
      });
    } catch (error) {
      toast.error('Data purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data plans when network is selected
  const loadDataPlans = async (network: string) => {
    const plans: Record<string, DataPlan[]> = {
      MTN: [
        { id: 'mtn-1gb', name: '1GB - 1 Day', size: '1GB', validity: '1 Day', price: 300 },
        { id: 'mtn-2gb', name: '2GB - 7 Days', size: '2GB', validity: '7 Days', price: 500 },
        { id: 'mtn-5gb', name: '5GB - 30 Days', size: '5GB', validity: '30 Days', price: 1500 },
        { id: 'mtn-10gb', name: '10GB - 30 Days', size: '10GB', validity: '30 Days', price: 2500 }
      ],
      Glo: [
        { id: 'glo-1.6gb', name: '1.6GB - 7 Days', size: '1.6GB', validity: '7 Days', price: 500 },
        { id: 'glo-3.9gb', name: '3.9GB - 14 Days', size: '3.9GB', validity: '14 Days', price: 1000 },
        { id: 'glo-7.5gb', name: '7.5GB - 30 Days', size: '7.5GB', validity: '30 Days', price: 1500 }
      ],
      Airtel: [
        { id: 'airtel-1.5gb', name: '1.5GB - 30 Days', size: '1.5GB', validity: '30 Days', price: 1000 },
        { id: 'airtel-3gb', name: '3GB - 30 Days', size: '3GB', validity: '30 Days', price: 1500 },
        { id: 'airtel-10gb', name: '10GB - 30 Days', size: '10GB', validity: '30 Days', price: 3000 }
      ],
      '9mobile': [
        { id: '9mobile-1.5gb', name: '1.5GB - 30 Days', size: '1.5GB', validity: '30 Days', price: 1000 },
        { id: '9mobile-4.5gb', name: '4.5GB - 30 Days', size: '4.5GB', validity: '30 Days', price: 2000 }
      ]
    };

    setDataPlans(plans[network] || []);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Bill Payments
            </h1>
            <p className="text-muted-foreground mt-1">
              Pay your bills quickly and securely
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="electricity" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs">Electricity</span>
            </TabsTrigger>
            <TabsTrigger value="cable" className="flex items-center gap-1">
              <Tv className="h-3 w-3" />
              <span className="text-xs">Cable TV</span>
            </TabsTrigger>
            <TabsTrigger value="airtime" className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              <span className="text-xs">Airtime</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              <span className="text-xs">Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Electricity Tab */}
          <TabsContent value="electricity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Buy Electricity
                </CardTitle>
                <CardDescription>
                  Purchase prepaid electricity for your meter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleElectricityPurchase} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="disco">Distribution Company</Label>
                      <Select
                        value={electricityForm.disco}
                        onValueChange={(value) => {
                          setElectricityForm({ ...electricityForm, disco: value });
                          setCustomerVerified(false);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select DISCO" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eko-electric">Eko Electricity (EKEDC)</SelectItem>
                          <SelectItem value="ikeja-electric">Ikeja Electric (IKEDC)</SelectItem>
                          <SelectItem value="abuja-electric">Abuja Electricity (AEDC)</SelectItem>
                          <SelectItem value="kano-electric">Kano Electricity (KEDCO)</SelectItem>
                          <SelectItem value="portharcourt-electric">Port Harcourt Electricity (PHED)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meterNumber">Meter Number</Label>
                      <div className="flex gap-2">
                        <Input
                          id="meterNumber"
                          placeholder="Enter meter number"
                          value={electricityForm.meterNumber}
                          onChange={(e) => {
                            setElectricityForm({ ...electricityForm, meterNumber: e.target.value });
                            setCustomerVerified(false);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => verifyCustomer('electricity', electricityForm.meterNumber, electricityForm.disco)}
                          disabled={!electricityForm.disco || !electricityForm.meterNumber || verifying}
                        >
                          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {customerVerified && customerDetails && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900">{customerDetails.customerName}</p>
                        <p className="text-sm text-green-700">{customerDetails.address}</p>
                        <p className="text-xs text-green-600 mt-1">Account Type: {customerDetails.accountType}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₦)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Minimum ₦500"
                      min="500"
                      value={electricityForm.amount}
                      onChange={(e) => setElectricityForm({ ...electricityForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !customerVerified}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay ₦${electricityForm.amount || '0'}`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cable TV Tab */}
          <TabsContent value="cable">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="h-5 w-5 text-purple-500" />
                  Cable TV Subscription
                </CardTitle>
                <CardDescription>
                  Renew your DSTV, GOTV, or StarTimes subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCableTVPurchase} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider</Label>
                      <Select
                        value={cableTVForm.provider}
                        onValueChange={(value) => {
                          setCableTVForm({ ...cableTVForm, provider: value });
                          setCustomerVerified(false);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DSTV">DSTV</SelectItem>
                          <SelectItem value="GOTV">GOTV</SelectItem>
                          <SelectItem value="StarTimes">StarTimes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smartcardNumber">Smartcard Number</Label>
                      <div className="flex gap-2">
                        <Input
                          id="smartcardNumber"
                          placeholder="Enter smartcard number"
                          value={cableTVForm.smartcardNumber}
                          onChange={(e) => {
                            setCableTVForm({ ...cableTVForm, smartcardNumber: e.target.value });
                            setCustomerVerified(false);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => verifyCustomer('cable_tv', cableTVForm.smartcardNumber, cableTVForm.provider)}
                          disabled={!cableTVForm.provider || !cableTVForm.smartcardNumber || verifying}
                        >
                          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {customerVerified && customerDetails && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900">{customerDetails.customerName}</p>
                        <p className="text-sm text-green-700">Current: {customerDetails.currentPackage}</p>
                        <p className="text-xs text-green-600 mt-1">Status: {customerDetails.status}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="package">Package</Label>
                    <Select
                      value={cableTVForm.package}
                      onValueChange={(value) => {
                        setCableTVForm({ ...cableTVForm, package: value });
                        // Set amount based on package (mock prices)
                        const prices: Record<string, string> = {
                          'Compact': '10500',
                          'Premium': '24500',
                          'Confam': '6200',
                          'Yanga': '3500',
                          'Padi': '2500'
                        };
                        setCableTVForm(prev => ({ ...prev, amount: prices[value] || '' }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compact">Compact - ₦10,500</SelectItem>
                        <SelectItem value="Premium">Premium - ₦24,500</SelectItem>
                        <SelectItem value="Confam">Confam - ₦6,200</SelectItem>
                        <SelectItem value="Yanga">Yanga - ₦3,500</SelectItem>
                        <SelectItem value="Padi">Padi - ₦2,500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !customerVerified || !cableTVForm.package}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay ₦${cableTVForm.amount || '0'}`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Airtime Tab */}
          <TabsContent value="airtime">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                  Buy Airtime
                </CardTitle>
                <CardDescription>
                  Recharge airtime for any Nigerian network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAirtimePurchase} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="network">Network</Label>
                    <Select
                      value={airtimeForm.network}
                      onValueChange={(value) => setAirtimeForm({ ...airtimeForm, network: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN</SelectItem>
                        <SelectItem value="Glo">Glo</SelectItem>
                        <SelectItem value="Airtel">Airtel</SelectItem>
                        <SelectItem value="9mobile">9mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="080XXXXXXXX"
                      value={airtimeForm.phoneNumber}
                      onChange={(e) => setAirtimeForm({ ...airtimeForm, phoneNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="airtimeAmount">Amount (₦)</Label>
                    <Input
                      id="airtimeAmount"
                      type="number"
                      placeholder="₦50 - ₦50,000"
                      min="50"
                      max="50000"
                      value={airtimeForm.amount}
                      onChange={(e) => setAirtimeForm({ ...airtimeForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[100, 200, 500, 1000].map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        onClick={() => setAirtimeForm({ ...airtimeForm, amount: amount.toString() })}
                      >
                        ₦{amount}
                      </Button>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Buy ₦${airtimeForm.amount || '0'} Airtime`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-green-500" />
                  Buy Data
                </CardTitle>
                <CardDescription>
                  Purchase data bundles for any Nigerian network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDataPurchase} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataNetwork">Network</Label>
                    <Select
                      value={dataForm.network}
                      onValueChange={(value) => {
                        setDataForm({ ...dataForm, network: value, plan: '', amount: '' });
                        loadDataPlans(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN</SelectItem>
                        <SelectItem value="Glo">Glo</SelectItem>
                        <SelectItem value="Airtel">Airtel</SelectItem>
                        <SelectItem value="9mobile">9mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataPhoneNumber">Phone Number</Label>
                    <Input
                      id="dataPhoneNumber"
                      type="tel"
                      placeholder="080XXXXXXXX"
                      value={dataForm.phoneNumber}
                      onChange={(e) => setDataForm({ ...dataForm, phoneNumber: e.target.value })}
                      required
                    />
                  </div>

                  {dataPlans.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="dataPlan">Data Plan</Label>
                      <Select
                        value={dataForm.plan}
                        onValueChange={(value) => {
                          const plan = dataPlans.find(p => p.id === value);
                          setDataForm({ 
                            ...dataForm, 
                            plan: value, 
                            amount: plan?.price.toString() || '' 
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select data plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {dataPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - ₦{plan.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !dataForm.plan}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Buy Data - ₦${dataForm.amount || '0'}`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Quick and Secure Payments
                </p>
                <p className="text-xs text-blue-700">
                  All transactions are encrypted and processed securely. You'll receive instant confirmation for all successful payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillPayments;
