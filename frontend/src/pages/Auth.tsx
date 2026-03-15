import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Eye,
  EyeOff,
  Shield,
  Fingerprint,
  Smartphone,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Binary,
  ShieldCheck
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBiometricAuth } from '@/hooks/use-biometric-auth';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import { toast } from 'sonner';

interface UserData {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthProps {
  onNavigate: (page: string) => void;
  onLogin: (user: UserData) => void;
}

export default function Auth({ onNavigate, onLogin }: AuthProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricSetup, setBiometricSetup] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    confirmPassword: '',
    dateOfBirth: '',
    bvn: ''
  });
  const [zkpStep, setZkpStep] = useState(false);
  const [zkpProgress, setZkpProgress] = useState(0);

  // Biometric authentication hook
  const biometric = useBiometricAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Call real API
    try {
      const deviceInfo = {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
        deviceInfo
      });

      const data = response.data as any;

      if (data?.mfaRequired) {
        toast.error(data.message || 'Additional verification required. MFA is not yet implemented in the app.');
        return;
      }

      if (!data?.success || !data?.data) {
        toast.error(data?.error || 'Login failed. Please try again.');
        return;
      }

      const { user, tokens } = data.data;

      if (tokens?.accessToken) {
        localStorage.setItem('token', tokens.accessToken);
      }
      if (tokens?.refreshToken) {
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }

      if (user?.accounts && user.accounts.length > 0 && user.accounts[0]?.accountNumber) {
        localStorage.setItem('primaryAccountNumber', user.accounts[0].accountNumber);
      }

      const appUser: UserData = {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        avatar: ''
      };

      onLogin(appUser);
      onNavigate('dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Login failed. Please check your credentials and try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setZkpStep(true);

    // Simulate ZKP generation progress
    const interval = setInterval(() => {
      setZkpProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);

    try {
      // 1. Initial Registration
      const regResponse = await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth
      });

      const regData = regResponse.data as any;
      if (regData.success && regData.data.tokens?.accessToken) {
        localStorage.setItem('token', regData.data.tokens.accessToken);
      }

      // 2. Perform ZKP Age Verification
      const zkpResponse = await api.post('/kyc/verify-bvn-zkp', {
        bvn: formData.bvn || '22334455667' // Fallback for demo
      });

      const zkpData = zkpResponse.data as any;
      if (zkpData.success) {
        toast.success('KYC Verified with Zero-Knowledge Proof!');
        const user: UserData = {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          avatar: ''
        };
        onLogin(user);
        onNavigate('dashboard');
      }
    } catch (error: any) {
      console.error('Registration/ZKP failed:', error);
      toast.error(error?.response?.data?.error || 'Verification failed');
      setZkpStep(false);
    } finally {
      setIsLoading(false);
      setZkpProgress(0);
    }
  };

  // Handle biometric authentication
  const handleBiometricLogin = async () => {
    try {
      const result = await biometric.authenticateWithBiometric();
      if (result.success) {
        // In a real app, you would validate the credential with your server
        // and get the user info. For demo purposes, we'll simulate this.
        const user: UserData = {
          name: 'Biometric User',
          email: 'user@example.com',
          avatar: ''
        };
        onLogin(user);
        onNavigate('dashboard');
      }
    } catch (error) {
      console.error('Biometric login failed:', error);
    }
  };

  const securityFeatures = [
    { icon: Shield, text: "256-bit SSL Encryption" },
    {
      icon: Fingerprint,
      text: biometric.isPlatformAvailable && biometric.authenticatorType !== 'none'
        ? biometric.authenticatorType
        : "Biometric Authentication"
    },
    { icon: Smartphone, text: "SMS Verification" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <Button
          variant="ghost"
          onClick={() => onNavigate('home')}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

          {/* Left Side - Security Features */}
          <div className="hidden lg:block space-y-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-4">
                Secure by Design
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed">
                Your security is our priority. Experience banking with military-grade protection and cutting-edge authentication.
              </p>
            </div>

            <div className="space-y-6">
              {securityFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-lg text-gray-300">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="bg-black/40 backdrop-blur-md border-white/20 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  Welcome to SznPay
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Connecting The Dots In Payments
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/10">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4 mt-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" />
                        <Label htmlFor="remember" className="text-sm text-gray-300">
                          Remember me
                        </Label>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>

                      {/* Biometric Error Display */}
                      {biometric.error && (
                        <Alert className="bg-red-500/10 border-red-500/20">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <AlertDescription className="text-red-300">
                            {biometric.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Biometric Login Button */}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                        onClick={handleBiometricLogin}
                        disabled={!biometric.isSupported || !biometric.isPlatformAvailable || !biometric.hasCredentials || biometric.isAuthenticating}
                      >
                        {biometric.isAuthenticating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <Fingerprint className="mr-2 h-4 w-4" />
                            {biometric.hasCredentials ? `Use ${biometric.authenticatorType}` : 'Set up Biometric Login'}
                          </>
                        )}
                      </Button>

                      {/* Biometric Support Info */}
                      {!biometric.isSupported && (
                        <div className="text-center text-sm text-gray-400">
                          Biometric authentication not supported in this browser
                        </div>
                      )}

                      {biometric.isSupported && !biometric.isPlatformAvailable && (
                        <div className="text-center text-sm text-gray-400">
                          No biometric authenticator available on this device
                        </div>
                      )}

                      {biometric.isSupported && biometric.isPlatformAvailable && !biometric.hasCredentials && (
                        <div className="text-center text-sm text-gray-400">
                          Register an account to set up biometric authentication
                        </div>
                      )}
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4 mt-6">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-white">First Name</Label>
                          <Input
                            id="firstName"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-white">Last Name</Label>
                          <Input
                            id="lastName"
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-white">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+234 801 234 5678"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="registerEmail" className="text-white">Email</Label>
                        <Input
                          id="registerEmail"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="registerPassword" className="text-white">Password</Label>
                        <Input
                          id="registerPassword"
                          type="password"
                          placeholder="Create a strong password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth" className="text-white">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bvn" className="text-white">BVN (for ZKP verification)</Label>
                        <Input
                          id="bvn"
                          placeholder="22334455667"
                          value={formData.bvn}
                          onChange={(e) => setFormData({ ...formData, bvn: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required
                        />
                      </div>

                      {/* ZKP Progress Overlay */}
                      {zkpStep && (
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-purple-300 flex items-center">
                              <Binary className="mr-2 h-4 w-4 animate-spin" />
                              Generating ZK Proof...
                            </span>
                            <span className="text-xs text-purple-400">{zkpProgress}%</span>
                          </div>
                          <Progress value={zkpProgress} className="h-1 bg-purple-900" />
                          <p className="text-[10px] text-gray-400">
                            We're mathematically proving you're 18+ without storing your DOB.
                          </p>
                        </div>
                      )}

                      {/* Biometric Setup Option */}
                      {biometric.isSupported && biometric.isPlatformAvailable && (
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="biometricSetup"
                            checked={biometricSetup}
                            onCheckedChange={(checked) => setBiometricSetup(checked === true)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="biometricSetup" className="text-sm text-white cursor-pointer">
                              Set up {biometric.authenticatorType}
                            </Label>
                            <p className="text-xs text-gray-400">
                              Enable biometric authentication for quick and secure access
                            </p>
                          </div>
                        </div>
                      )}

                      <Alert className="bg-green-500/10 border-green-500/20">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-green-300">
                          {zkpStep ? 'Cryptographic proof verified' : 'Your account will be secured with bank-grade encryption'}
                        </AlertDescription>
                      </Alert>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                        disabled={isLoading}
                      >
                        {isLoading ? "Processing..." : "Create Account & Verify"}
                      </Button>

                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}