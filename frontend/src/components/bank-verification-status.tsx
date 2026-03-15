import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  User, 
  Building2, 
  Shield, 
  RefreshCw,
  X
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BankVerificationResult } from '@/lib/bank-verification';

interface BankVerificationStatusProps {
  verification: BankVerificationResult | null;
  isVerifying: boolean;
  error: string | null;
  onRetry?: () => void;
  onClear?: () => void;
  className?: string;
  compact?: boolean; // Show compact version
}

export function BankVerificationStatus({
  verification,
  isVerifying,
  error,
  onRetry,
  onClear,
  className = '',
  compact = false
}: BankVerificationStatusProps) {
  // Loading state
  if (isVerifying) {
    return (
      <Alert className={`bg-blue-500/10 border-blue-500/20 ${className}`}>
        <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
        <AlertDescription className="text-blue-300 flex items-center justify-between">
          <span>Verifying bank account...</span>
          {onClear && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClear}
              className="h-auto p-1 text-blue-300 hover:text-blue-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert className={`bg-red-500/10 border-red-500/20 ${className}`}>
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex items-center space-x-2">
              {onRetry && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRetry}
                  className="h-auto p-1 text-red-300 hover:text-red-100"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              {onClear && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClear}
                  className="h-auto p-1 text-red-300 hover:text-red-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Success state
  if (verification?.success && verification.data) {
    const { data } = verification;
    
    if (compact) {
      return (
        <Alert className={`bg-green-500/10 border-green-500/20 ${className}`}>
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{data.accountName}</span>
                <Badge variant="outline" className="text-xs text-green-300 border-green-600">
                  {data.bankName}
                </Badge>
              </div>
              {onClear && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClear}
                  className="h-auto p-1 text-green-300 hover:text-green-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className={`bg-green-500/10 border-green-500/20 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Account Verified Successfully!</span>
              {onClear && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClear}
                  className="h-auto p-1 text-green-300 hover:text-green-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-green-400" />
                <div>
                  <p className="font-medium text-green-100">{data.accountName}</p>
                  <p className="text-green-300/80">Account Holder</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-green-400" />
                <div>
                  <p className="font-medium text-green-100">{data.bankName}</p>
                  <p className="text-green-300/80">
                    {data.accountType} Account
                    {data.accountNumber && ` • ${data.accountNumber}`}
                  </p>
                </div>
              </div>
              
              {data.bvnLinked && (
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="font-medium text-green-100">BVN Verified</p>
                    <p className="text-green-300/80">Identity Confirmed</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <div>
                  <p className="font-medium text-green-100">Active Account</p>
                  <p className="text-green-300/80">Ready to receive payments</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs text-green-300 border-green-600">
                  Verified
                </Badge>
                {data.bvnLinked && (
                  <Badge variant="outline" className="text-xs text-blue-300 border-blue-600">
                    BVN Linked
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // No verification data
  return null;
}

// Quick verification status indicator (for inline use)
export function BankVerificationIndicator({
  verification,
  isVerifying,
  error,
  size = 'sm'
}: {
  verification: BankVerificationResult | null;
  isVerifying: boolean;
  error: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (isVerifying) {
    return <Loader2 className={`${sizeClasses[size]} text-blue-400 animate-spin`} />;
  }

  if (error) {
    return <AlertCircle className={`${sizeClasses[size]} text-red-400`} />;
  }

  if (verification?.success) {
    return <CheckCircle className={`${sizeClasses[size]} text-green-400`} />;
  }

  return null;
}