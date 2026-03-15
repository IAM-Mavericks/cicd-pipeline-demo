import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Fingerprint, 
  Smartphone, 
  Key, 
  Eye,
  Lock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Bell
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecurityProps {
  onNavigate: (page: string) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function Security({ onNavigate, user }: SecurityProps) {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    biometricLogin: true,
    smsNotifications: true,
    emailNotifications: true,
    transactionAlerts: true,
    loginAlerts: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const securityScore = 85;

  const securityFeatures = [
    {
      icon: Shield,
      title: '256-bit SSL Encryption',
      description: 'All data is encrypted with bank-grade security',
      status: 'active',
      color: 'green'
    },
    {
      icon: Fingerprint,
      title: 'Biometric Authentication',
      description: 'Login with fingerprint or face recognition',
      status: 'active',
      color: 'green'
    },
    {
      icon: Smartphone,
      title: 'Two-Factor Authentication',
      description: 'SMS verification for all transactions',
      status: 'active',
      color: 'green'
    },
    {
      icon: Key,
      title: 'Advanced Password Policy',
      description: 'Strong password requirements enforced',
      status: 'active',
      color: 'green'
    }
  ];

  const recentActivity = [
    {
      action: 'Login from Lagos, Nigeria',
      timestamp: '2 minutes ago',
      device: 'iPhone 14 Pro',
      status: 'success'
    },
    {
      action: 'Password changed',
      timestamp: '2 days ago',
      device: 'MacBook Pro',
      status: 'success'
    },
    {
      action: 'Failed login attempt',
      timestamp: '1 week ago',
      device: 'Unknown device',
      status: 'warning'
    },
    {
      action: 'Two-factor auth enabled',
      timestamp: '2 weeks ago',
      device: 'iPhone 14 Pro',
      status: 'success'
    }
  ];

  const handlePasswordChange = () => {
    
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const toggleSetting = (setting: keyof typeof securitySettings) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
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
        <Navbar currentPage="security" onNavigate={onNavigate} user={user} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Security Center</h1>
            <p className="text-gray-300">Manage your account security and privacy settings</p>
          </div>

          {/* Security Score */}
          <Card className="bg-gradient-to-br from-green-500/10 to-blue-600/10 backdrop-blur-md border-green-500/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Security Score: {securityScore}%</h3>
                    <p className="text-green-300">Excellent - Your account is well protected</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-24 h-24 relative">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-700"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-green-400"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${securityScore}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{securityScore}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Security Features */}
            <div className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Security Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {securityFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            feature.color === 'green' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{feature.title}</p>
                            <p className="text-gray-400 text-sm">{feature.description}</p>
                          </div>
                        </div>
                        <Badge className={`${
                          feature.status === 'active' 
                            ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                            : 'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}>
                          {feature.status}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Privacy Settings */}
              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Privacy & Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Two-Factor Authentication</p>
                      <p className="text-gray-400 text-sm">Require SMS code for login</p>
                    </div>
                    <Switch 
                      checked={securitySettings.twoFactorAuth}
                      onCheckedChange={() => toggleSetting('twoFactorAuth')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Biometric Login</p>
                      <p className="text-gray-400 text-sm">Use fingerprint or face ID</p>
                    </div>
                    <Switch 
                      checked={securitySettings.biometricLogin}
                      onCheckedChange={() => toggleSetting('biometricLogin')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">SMS Notifications</p>
                      <p className="text-gray-400 text-sm">Receive SMS for transactions</p>
                    </div>
                    <Switch 
                      checked={securitySettings.smsNotifications}
                      onCheckedChange={() => toggleSetting('smsNotifications')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Email Notifications</p>
                      <p className="text-gray-400 text-sm">Receive email alerts</p>
                    </div>
                    <Switch 
                      checked={securitySettings.emailNotifications}
                      onCheckedChange={() => toggleSetting('emailNotifications')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Transaction Alerts</p>
                      <p className="text-gray-400 text-sm">Instant transaction notifications</p>
                    </div>
                    <Switch 
                      checked={securitySettings.transactionAlerts}
                      onCheckedChange={() => toggleSetting('transactionAlerts')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Login Alerts</p>
                      <p className="text-gray-400 text-sm">Notify on new device login</p>
                    </div>
                    <Switch 
                      checked={securitySettings.loginAlerts}
                      onCheckedChange={() => toggleSetting('loginAlerts')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Change Password */}
              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-white">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-white">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  <Button 
                    onClick={handlePasswordChange}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  >
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white/5 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Recent Security Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.status === 'success' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {activity.status === 'success' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{activity.action}</p>
                          <p className="text-gray-400 text-xs">{activity.device}</p>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs">{activity.timestamp}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}