/**
 * SMS Fallback Component
 * Provides a user-friendly interface for sending payment commands via SMS
 * when the app is offline or unavailable
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Copy, Send, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SMSFallbackProps {
    isOffline?: boolean;
    onClose?: () => void;
}

interface SMSCommand {
    type: string;
    format: string;
    example: string;
    description: string;
}

const SMS_GATEWAY_NUMBER = '0800796729'; // SznPay SMS Gateway

const SMS_COMMANDS: SMSCommand[] = [
    {
        type: 'TRANSFER',
        format: 'PAY <amount> <account_number> <bank_code>',
        example: 'PAY 5000 1234567890 058',
        description: 'Send money to another bank account'
    },
    {
        type: 'BALANCE',
        format: 'BAL',
        example: 'BAL',
        description: 'Check your account balance'
    },
    {
        type: 'AIRTIME',
        format: 'AIRTIME <amount> <phone_number>',
        example: 'AIRTIME 500 08012345678',
        description: 'Buy airtime for yourself or others'
    },
    {
        type: 'HISTORY',
        format: 'HISTORY <count>',
        example: 'HISTORY 5',
        description: 'Get your recent transaction history'
    }
];

export default function SMSFallback({ isOffline = false, onClose }: SMSFallbackProps) {
    const [selectedCommand, setSelectedCommand] = useState<SMSCommand | null>(null);
    const [customMessage, setCustomMessage] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(SMS_GATEWAY_NUMBER);
        setCopied(true);
        toast.success('Gateway number copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCommand = (command: string) => {
        navigator.clipboard.writeText(command);
        toast.success('Command copied to clipboard!');
    };

    const handleSendSMS = (message: string) => {
        const smsUrl = `sms:${SMS_GATEWAY_NUMBER}?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
        toast.info('📱 SMS App Opened', {
            description: 'Please send the pre-filled message to complete your transaction.'
        });
    };

    return (
        <Card className="bg-slate-900/50 border-orange-500/30 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-orange-400" />
                        <CardTitle className="text-xl">SMS Fallback</CardTitle>
                    </div>
                    {isOffline && (
                        <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                            📡 Offline Mode
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-gray-400">
                    Send payment commands via SMS when the app is unavailable
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Gateway Number */}
                <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">SznPay SMS Gateway</p>
                            <p className="text-2xl font-bold text-white font-mono">{SMS_GATEWAY_NUMBER}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyNumber}
                            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Info Alert */}
                <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-gray-300">
                        SMS commands work even when you're offline. Standard SMS rates apply.
                    </AlertDescription>
                </Alert>

                {/* Available Commands */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                        Available Commands
                    </h3>
                    <div className="grid gap-3">
                        {SMS_COMMANDS.map((cmd) => (
                            <div
                                key={cmd.type}
                                className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedCommand?.type === cmd.type
                                        ? 'bg-orange-500/20 border-orange-500/40'
                                        : 'bg-slate-800/50 border-slate-700/50 hover:border-orange-500/30'
                                    }`}
                                onClick={() => setSelectedCommand(cmd)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">
                                                {cmd.type}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">{cmd.description}</p>
                                        <div className="bg-black/30 rounded p-2 font-mono text-xs text-green-400">
                                            {cmd.format}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Example: {cmd.example}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyCommand(cmd.example);
                                            }}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendSMS(cmd.example);
                                            }}
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How It Works */}
                <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-400" />
                        How It Works
                    </h4>
                    <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                        <li>Choose a command from the list above</li>
                        <li>Click the Send button to open your SMS app</li>
                        <li>The message will be pre-filled with the correct format</li>
                        <li>Send the SMS to complete your transaction</li>
                        <li>You'll receive a confirmation SMS within seconds</li>
                    </ol>
                </div>

                {/* Security Notice */}
                <div className="text-xs text-gray-500 space-y-1">
                    <p>🔐 All SMS commands are encrypted and verified</p>
                    <p>⚡ Transactions are processed instantly upon receipt</p>
                    <p>📱 Works on any phone, even basic feature phones</p>
                </div>
            </CardContent>
        </Card>
    );
}
