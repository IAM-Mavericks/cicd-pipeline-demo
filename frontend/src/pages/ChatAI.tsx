import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Bot, User as UserIcon, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

interface ChatAIProps {
  onNavigate: (page: string) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface TransactionPreview {
  type: 'transfer' | 'bill_payment' | 'airtime';
  recipient?: {
    name: string;
    account: string;
  };
  provider?: string;
  billType?: string;
  network?: string;
  phoneNumber?: string;
  amount: number;
  fee?: number;
  total: number;
}

interface PendingTransaction {
  sessionId: string;
  preview: TransactionPreview;
  intent: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  transactionPreview?: TransactionPreview;
  sessionId?: string;
  requiresAuth?: boolean;
}

interface APIResponse {
  success: boolean;
  response: string;
  transactionPreview?: TransactionPreview;
  sessionId?: string;
  requiresAuth?: boolean;
  intent?: string;
  transaction?: any;
}

export default function ChatAI({ onNavigate, user }: ChatAIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your SznPay AI assistant. How can I help you today?\n\nYou can:\n• Send money: "Send 5000 naira to John"\n• Pay bills: "Pay my DSTV subscription"\n• Buy airtime: "Buy 500 naira MTN airtime for 08012345678"\n• Check balance: "What\'s my balance?"\n• View transactions: "Show my recent transactions"\n\nI also understand Nigerian Pidgin! 🇳🇬',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [authCode, setAuthCode] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post<APIResponse>(
        '/conversational/process',
        {
          message: currentInput,
          sessionId: pendingTransaction?.sessionId
        }
      );

      const { success, response: aiResponse, transactionPreview, sessionId, requiresAuth, intent } = response.data;

      if (success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
          transactionPreview,
          sessionId,
          requiresAuth
        };

        setMessages(prev => [...prev, aiMessage]);

        // If transaction requires confirmation, set pending state
        if (requiresAuth && transactionPreview) {
          setPendingTransaction({
            sessionId: sessionId || '',
            preview: transactionPreview,
            intent: intent || ''
          });
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse || 'Sorry, I couldn\'t process that request.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: unknown) {
      console.error('Error processing message:', error);
      const axiosError = error as AxiosError<APIResponse>;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: axiosError.response?.data?.response || 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process command');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTransaction || !authCode) {
      toast.error('Please enter your PIN');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<APIResponse>(
        '/conversational/execute',
        {
          sessionId: pendingTransaction.sessionId,
          authCode
        }
      );

      const { success, response: aiResponse, transaction } = response.data;

      if (success) {
        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
        toast.success('Transaction completed successfully!');
        setPendingTransaction(null);
        setAuthCode('');
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Error executing transaction:', error);
      const axiosError = error as AxiosError<APIResponse>;
      toast.error(axiosError.response?.data?.response || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTransaction = () => {
    setPendingTransaction(null);
    setAuthCode('');
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Transaction cancelled. How else can I help you?',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar currentPage="chat" onNavigate={onNavigate} user={user} />
      
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent mb-2">
            AI Assistant
          </h1>
          <p className="text-gray-400">
            Chat with your intelligent banking assistant
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-md h-[calc(100vh-280px)] flex flex-col">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="flex items-center gap-2 text-white">
              <MessageSquare className="h-5 w-5 text-cyan-400" />
              Conversation
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className="max-w-[70%]">
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                        : 'bg-slate-700/50 text-white border border-slate-600'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* Transaction Preview */}
                  {message.transactionPreview && (
                    <div className="mt-2 bg-slate-800 border border-cyan-500/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-3">Transaction Preview</h4>
                      <div className="space-y-2 text-sm">
                        {message.transactionPreview.type === 'transfer' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">To:</span>
                              <span className="text-white font-medium">{message.transactionPreview.recipient?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Account:</span>
                              <span className="text-white">{message.transactionPreview.recipient?.account}</span>
                            </div>
                          </>
                        )}
                        {message.transactionPreview.type === 'bill_payment' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Provider:</span>
                              <span className="text-white font-medium">{message.transactionPreview.provider}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Bill Type:</span>
                              <span className="text-white">{message.transactionPreview.billType}</span>
                            </div>
                          </>
                        )}
                        {message.transactionPreview.type === 'airtime' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Network:</span>
                              <span className="text-white font-medium">{message.transactionPreview.network}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Phone:</span>
                              <span className="text-white">{message.transactionPreview.phoneNumber}</span>
                            </div>
                          </>
                        )}
                        <div className="border-t border-slate-600 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Amount:</span>
                            <span className="text-white">₦{message.transactionPreview.amount?.toLocaleString()}</span>
                          </div>
                          {message.transactionPreview.fee && message.transactionPreview.fee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Fee:</span>
                              <span className="text-white">₦{message.transactionPreview.fee?.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold">
                            <span className="text-cyan-400">Total:</span>
                            <span className="text-cyan-400">₦{message.transactionPreview.total?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-700/50 text-white border border-slate-600 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        {!pendingTransaction && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50"
              onClick={() => setInput('Check my account balance')}
            >
              Check Balance
            </Button>
            <Button
              variant="outline"
              className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50"
              onClick={() => setInput('Show my recent transactions')}
            >
              Recent Transactions
            </Button>
            <Button
              variant="outline"
              className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50"
              onClick={() => setInput('Send 5000 naira to John')}
            >
              Send Money
            </Button>
            <Button
              variant="outline"
              className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50"
              onClick={() => setInput('Pay my DSTV subscription')}
            >
              Pay Bills
            </Button>
          </div>
        )}

        {/* Transaction Confirmation Dialog */}
        {pendingTransaction && (
          <Card className="mt-4 bg-slate-800 border-yellow-500/50 shadow-lg shadow-yellow-500/20">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                Confirm Transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-white text-sm">
                  Please enter your PIN to authorize this transaction.
                </p>
                
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Transaction PIN</label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="bg-slate-700/50 border-slate-600 text-white"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleConfirmTransaction}
                    disabled={authCode.length !== 4 || isLoading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm
                  </Button>
                  <Button
                    onClick={handleCancelTransaction}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
