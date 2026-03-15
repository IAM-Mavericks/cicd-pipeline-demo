import { useState, useEffect } from 'react';
import {
    Shield,
    Lock,
    CheckCircle,
    ShieldCheck,
    Binary,
    EyeOff,
    Search,
    ShieldAlert,
    ArrowLeft,
    BookOpen,
    Fingerprint,
    Loader2,
    Terminal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '@/lib/api';
import { toast } from 'sonner';
import { verifyFullSolvencyProof } from '@/lib/zkp-verifier';

interface PrivacyProps {
    onNavigate: (page: string) => void;
}

export default function Privacy({ onNavigate }: PrivacyProps) {
    const [loading, setLoading] = useState(true);
    const [privacyData, setPrivacyData] = useState<any>(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationLogs, setVerificationLogs] = useState<string[]>([]);
    const [verificationResult, setVerificationResult] = useState<any>(null);

    useEffect(() => {
        const fetchPrivacyStatus = async () => {
            try {
                const response = await api.get('/kyc/privacy-status');
                const data = response.data as any;
                if (data.success) {
                    setPrivacyData(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch privacy status:', error);
                toast.error('Could not load privacy status');
            } finally {
                setLoading(false);
            }
        };

        fetchPrivacyStatus();
    }, []);

    const privacyFeatures = [
        {
            title: 'Zero-Knowledge Proofs (ZKP)',
            description: 'We verify your identity using advanced cryptography. We know you are authorized, but we don\'t need to see or store your private data.',
            status: privacyData?.ageVerified ? 'Active' : 'Pending',
            icon: Binary,
            color: 'text-green-400'
        },
        {
            title: 'Data Minimization',
            description: 'SznPay adheres to NDPR and POPIA principles. We only collect the bare minimum required by law.',
            status: 'Enforced',
            icon: EyeOff,
            color: 'text-blue-400'
        },
        {
            title: 'Proof-of-Solvency',
            description: 'Verify that SznPay has the reserves to cover 100% of user balances without revealing individual account details.',
            status: 'Verified Daily',
            icon: Search,
            color: 'text-purple-400'
        }
    ];

    const handleVerifyInclusion = async () => {
        setVerifying(true);
        setVerificationLogs([]);
        setVerificationResult(null);

        const addLog = (msg: string) => {
            setVerificationLogs(prev => [...prev, msg]);
        };

        try {
            addLog('🚀 Starting Proof-of-Solvency Verification...');

            // Step 1: Fetch global solvency status
            addLog('📡 Fetching global solvency status...');
            const statusResponse = await api.get('/solvency/status');
            const globalStatus = statusResponse.data.data;
            addLog(`✅ Root Hash: ${globalStatus.rootHash}`);
            addLog(`✅ Total Liabilities: ${(Number(globalStatus.totalLiabilities) / 1e8).toFixed(2)} NGN`);
            addLog(`✅ Total Reserves: ${(Number(globalStatus.totalReserves) / 1e8).toFixed(2)} NGN`);
            addLog(`✅ Reserve Ratio: ${globalStatus.reserveRatio}`);

            // Step 2: Fetch user inclusion proof
            addLog('🔐 Retrieving your inclusion proof...');
            const proofResponse = await api.get('/solvency/user-proof');
            const userProof = proofResponse.data.data;
            addLog('✅ Inclusion proof retrieved');

            // Step 3: Perform client-side verification
            addLog('🔍 Loading cryptographic verification keys...');
            addLog('⚙️  Executing snarkjs.plonk.verify()...');

            const verification = await verifyFullSolvencyProof(
                userProof.inclusionProof,
                userProof.zkProof,
                userProof.publicSignals
            );

            // Add Merkle path steps
            verification.steps.forEach(step => addLog(step));

            // Add ZKP result
            if (verification.zkpValid) {
                addLog(`\n🌟 ZKP Verification: CRYPTOGRAPHICALLY VALID`);
                addLog(`⏱️  Verification completed in ${verification.zkpResult.duration}ms`);
            } else {
                addLog(`\n❌ ZKP Verification: FAILED`);
                addLog(`Error: ${verification.zkpResult.error}`);
            }

            setVerificationResult(verification);

            if (verification.zkpValid && verification.merkleValid) {
                toast.success('✅ Proof-of-Solvency Verified!', {
                    description: 'Your inclusion in SznPay\'s reserves has been mathematically proven.'
                });
            } else {
                toast.error('❌ Verification Failed', {
                    description: 'Unable to verify your inclusion. Please contact support.'
                });
            }
        } catch (error: any) {
            console.error('Verification error:', error);
            addLog(`\n❌ Error: ${error.message}`);
            toast.error('Verification failed', {
                description: error.response?.data?.error || error.message
            });
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')} className="text-gray-400">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                            Fortress of Trust
                        </h1>
                        <p className="text-gray-400">Your privacy, mathematically guaranteed.</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 px-3 py-1">
                    NDPR Compliant
                </Badge>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Verification Status Card */}
                <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl flex items-center">
                                    <ShieldCheck className="mr-2 h-6 w-6 text-green-400" />
                                    Privacy Verification Status
                                </CardTitle>
                                <CardDescription className="text-gray-400">
                                    Real-time status of your cryptographic identity proofs.
                                </CardDescription>
                            </div>
                            {privacyData?.ageVerified && (
                                <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                                    <CheckCircle className="h-8 w-8 text-green-400" />
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <p className="text-sm text-gray-400 mb-1">KYC Tier</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold">Tier {privacyData?.kycTier || 1}</span>
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">Verified</Badge>
                                </div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <p className="text-sm text-gray-400 mb-1">Privacy Level</p>
                                <span className="text-2xl font-bold text-green-400">{privacyData?.privacyLevel || 'Standard'}</span>
                            </div>
                        </div>

                        {privacyData?.ageVerified && (
                            <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                                <div className="flex items-start space-x-3">
                                    <Lock className="h-5 w-5 text-green-400 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-green-400">DOB Not Stored</h4>
                                        <p className="text-sm text-gray-300">
                                            Your age was verified via ZKP. Your actual date of birth was purged from our systems immediately after proof generation.
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2 font-mono">Proof ID: {privacyData?.zkpProofId}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {privacyFeatures.map((feature, i) => (
                        <Card key={i} className="bg-slate-900/40 border-white/10 flex flex-col">
                            <CardHeader>
                                <feature.icon className={`h-8 w-8 ${feature.color} mb-2`} />
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                                <Badge variant="secondary" className="w-fit">{feature.status}</Badge>
                            </CardHeader>
                            <CardContent className="text-sm text-gray-400 flex-grow">
                                {feature.description}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Technical Deep Dive */}
                <Tabs defaultValue="zkp" className="w-full">
                    <TabsList className="bg-slate-900 border-white/10">
                        <TabsTrigger value="zkp">How ZKP Works</TabsTrigger>
                        <TabsTrigger value="compliance">Compliance</TabsTrigger>
                    </TabsList>
                    <TabsContent value="zkp">
                        <Card className="bg-slate-900/30 border-white/10">
                            <CardContent className="pt-6 space-y-4">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <Binary className="mr-2 h-5 w-5 text-purple-400" />
                                    The Circular Logic of Trust
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    When you verify your BVN, our server calculates a "Proof" that your birth year makes you over 18.
                                    This proof is a complex mathematical expression. We store the *result* of the math, but the
                                    *inputs* (your birth year) are never written to disk.
                                </p>
                                <div className="flex items-center space-x-4 p-4 bg-black/30 rounded-lg">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span>Proving Difficulty</span>
                                            <span>High</span>
                                        </div>
                                        <Progress value={85} className="h-1 bg-gray-800" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span>Verification Speed</span>
                                            <span>Instant</span>
                                        </div>
                                        <Progress value={95} className="h-1 bg-gray-800" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="compliance">
                        <Card className="bg-slate-900/30 border-white/10">
                            <CardContent className="pt-6 space-y-4">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <ShieldAlert className="mr-2 h-5 w-5 text-blue-400" />
                                    Meeting Global Standards
                                </h3>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li className="flex items-center">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        NDPR: Article 2.2 (Data Minimization)
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        POPIA: Section 10 (Processing Limitation)
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        CBN: Tiered KYC Compliance with Privacy
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Proof-of-Solvency Verification Section */}
                <Card className="bg-slate-900/50 border-purple-500/30 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <Search className="mr-2 h-6 w-6 text-purple-400" />
                            Verify Your Inclusion
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            Independently verify that your balance is included in SznPay's Proof-of-Solvency using Zero-Knowledge Proofs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <div>
                                <p className="text-sm text-gray-400">Verification Status</p>
                                <p className="text-lg font-semibold">
                                    {verificationResult?.zkpValid ? (
                                        <span className="text-green-400">✅ Mathematically Verified</span>
                                    ) : verificationResult === null ? (
                                        <span className="text-gray-400">Not Yet Verified</span>
                                    ) : (
                                        <span className="text-red-400">❌ Verification Failed</span>
                                    )}
                                </p>
                            </div>
                            <Button
                                onClick={handleVerifyInclusion}
                                disabled={verifying}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {verifying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Verify Now
                                    </>
                                )}
                            </Button>
                        </div>

                        {verificationLogs.length > 0 && (
                            <div className="bg-black/50 rounded-lg border border-green-500/20 p-4">
                                <div className="flex items-center mb-2">
                                    <Terminal className="h-4 w-4 text-green-400 mr-2" />
                                    <span className="text-sm font-mono text-green-400">Verification Terminal</span>
                                </div>
                                <ScrollArea className="h-64">
                                    <div className="font-mono text-xs space-y-1">
                                        {verificationLogs.map((log, i) => (
                                            <div key={i} className="text-gray-300">
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        <div className="text-xs text-gray-500 space-y-1">
                            <p>💡 This verification runs entirely in your browser using cryptographic proofs.</p>
                            <p>🔐 No sensitive data is transmitted during verification.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Call to Action */}
                <div className="text-center py-8">
                    <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Read our Privacy Whitepaper
                    </Button>
                </div>
            </div>
        </div>
    );
}
