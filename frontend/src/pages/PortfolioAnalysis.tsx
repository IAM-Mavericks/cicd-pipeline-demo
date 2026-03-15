import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart2, ArrowLeft, AlertCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';

type InsightSeverity = 'high' | 'medium' | 'low';

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  action?: string;
  category: 'liquidity' | 'valuation' | 'momentum' | 'diversification' | 'concentration' | 'cash' | 'tax' | 'risk';
}

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  weight: number;
  sector: string;
  dailyChange: number;
  dailyChangePercent: number;
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  sectorAllocation: Array<{ sector: string; percentage: number }>;
  topHoldings: Holding[];
  insights: Insight[];
}

export default function PortfolioAnalysis() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [portfolio, setPortfolio] = useState<PortfolioMetrics | null>(null);

  // Mock data - in a real app, this would come from an API
  useEffect(() => {
    // Simulate API call
    const fetchPortfolioData = async () => {
      try {
        // In a real app, you would fetch this from your backend
        // const response = await fetch('/api/portfolio/analysis');
        // const data = await response.json();
        
        // Mock data
        setTimeout(() => {
          setPortfolio({
            totalValue: 12500000,
            totalCost: 9800000,
            totalGain: 2700000,
            totalGainPercent: 27.55,
            dailyChange: 125000,
            dailyChangePercent: 1.01,
            sectorAllocation: [
              { sector: 'Banking', percentage: 42.5 },
              { sector: 'Consumer Goods', percentage: 18.3 },
              { sector: 'Industrial', percentage: 15.7 },
              { sector: 'Healthcare', percentage: 12.2 },
              { sector: 'Other', percentage: 11.3 },
            ],
            topHoldings: [
              {
                symbol: 'ZENITHBANK',
                name: 'Zenith Bank',
                quantity: 15000,
                avgPrice: 25.5,
                currentPrice: 32.75,
                weight: 28.4,
                sector: 'Banking',
                dailyChange: 1.25,
                dailyChangePercent: 2.1,
              },
              {
                symbol: 'GUARANTY',
                name: 'Guaranty Trust Bank',
                quantity: 10000,
                avgPrice: 28.2,
                currentPrice: 34.6,
                weight: 22.1,
                sector: 'Banking',
                dailyChange: 0.85,
                dailyChangePercent: 1.5,
              },
              {
                symbol: 'NESTLE',
                name: 'Nestle Nigeria',
                quantity: 5000,
                avgPrice: 1450,
                currentPrice: 1520,
                weight: 18.3,
                sector: 'Consumer Goods',
                dailyChange: -12.5,
                dailyChangePercent: -0.8,
              },
            ],
            insights: [
              {
                id: '1',
                title: 'High Banking Sector Concentration',
                description: 'Your portfolio has 64.6% exposure to the banking sector, which increases risk.',
                severity: 'high',
                action: 'Diversify',
                category: 'concentration',
              },
              {
                id: '2',
                title: 'NESTLE is Overvalued',
                description: 'NESTLE is trading at a P/E of 24.5x vs sector average of 18.2x.',
                severity: 'medium',
                action: 'Review',
                category: 'valuation',
              },
              {
                id: '3',
                title: 'Strong Momentum in ZENITHBANK',
                description: 'ZENITHBANK has gained 12.3% over the past month.',
                severity: 'low',
                action: 'View Chart',
                category: 'momentum',
              },
            ],
          });
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  if (isLoading || !portfolio) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-white rounded-lg shadow"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-white rounded-lg shadow"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { 
    totalValue, 
    totalGain, 
    totalGainPercent, 
    dailyChange, 
    dailyChangePercent,
    sectorAllocation,
    topHoldings,
    insights,
  } = portfolio;

  const isGainPositive = totalGain >= 0;
  const isDailyChangePositive = dailyChange >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Analysis</h1>
        </div>

        {/* Portfolio Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-3xl font-bold">
                  ₦{totalValue.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center mt-1 ${isGainPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isGainPositive ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {isGainPositive ? '+' : ''}
                  ₦{Math.abs(totalGain).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}({isGainPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%)
                  <span className="text-gray-500 ml-2">All time</span>
                </div>
                <div className={`flex items-center text-sm mt-1 ${isDailyChangePositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isDailyChangePositive ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {isDailyChangePositive ? '+' : ''}
                  ₦{Math.abs(dailyChange).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}({isDailyChangePositive ? '+' : ''}{dailyChangePercent.toFixed(2)}%)
                  <span className="text-gray-500 ml-2">Today</span>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <Button variant="outline" className="mr-2">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  View Charts
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Trade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Sector Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sector Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectorAllocation.map((sector) => (
                      <div key={sector.sector} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{sector.sector}</span>
                          <span className="text-gray-500">{sector.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${sector.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Holdings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topHoldings.map((holding) => (
                      <div key={holding.symbol} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{holding.symbol}</div>
                          <div className="text-sm text-gray-500">{holding.name}</div>
                        </div>
                        <div className="text-right">
                          <div>₦{holding.currentPrice.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className={`text-sm ${holding.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.dailyChange >= 0 ? '+' : ''}
                            {holding.dailyChangePercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.slice(0, 3).map((insight) => (
                    <div 
                      key={insight.id}
                      className="flex items-start p-3 rounded-md border border-gray-200"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {insight.severity === 'high' ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : insight.severity === 'medium' ? (
                          <Info className="h-5 w-5 text-amber-500" />
                        ) : (
                          <BarChart2 className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium">{insight.title}</div>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                        {insight.action && (
                          <button 
                            className="text-sm mt-1 text-blue-600 hover:underline"
                            onClick={() => {}}
                          >
                            {insight.action} →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holdings Tab */}
          <TabsContent value="holdings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Cost</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day Change</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topHoldings.map((holding) => {
                        const value = holding.quantity * holding.currentPrice;
                        const cost = holding.quantity * holding.avgPrice;
                        const gain = value - cost;
                        const gainPercent = (gain / cost) * 100;
                        const isGain = gain >= 0;
                        
                        return (
                          <tr key={holding.symbol} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {holding.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {holding.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {holding.quantity.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₦{holding.avgPrice.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₦{holding.currentPrice.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₦{value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${holding.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {holding.dailyChange >= 0 ? '+' : ''}{holding.dailyChangePercent.toFixed(2)}%
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isGain ? 'text-green-600' : 'text-red-600'}`}>
                              {isGain ? '+' : ''}₦{Math.abs(gain).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {' '}({isGain ? '+' : ''}{gainPercent.toFixed(2)}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Portfolio Insights</CardTitle>
                  <div className="flex space-x-2
                  ">
                    <Button variant="outline" size="sm">
                      <BarChart2 className="h-4 w-4 mr-2" />
                      View All Metrics
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Risk Assessment */}
                  <div>
                    <h3 className="text-md font-medium mb-3">Risk Assessment</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Concentration Risk</div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">High</div>
                            <Badge variant="destructive">Action Needed</Badge>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            64.6% in Banking sector
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Volatility</div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">Medium</div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Monitor</Badge>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            Beta: 1.2 vs 1.0 market
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Liquidity</div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">Good</div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Healthy</Badge>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            Average daily volume: 1.2M shares
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Valuation */}
                  <div>
                    <h3 className="text-md font-medium mb-3">Valuation</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">P/E Ratio</div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">14.2x</div>
                            <div className="text-sm text-green-600">-12% vs market</div>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            Market: 16.1x | Sector: 15.8x
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">P/B Ratio</div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">1.8x</div>
                            <div className="text-sm text-amber-600">+5% vs market</div>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            Market: 1.7x | Sector: 2.1x
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Dividend Yield</div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">4.2%</div>
                            <div className="text-sm text-green-600">+0.8% vs market</div>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            Market: 3.4% | Sector: 3.9%
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* All Insights */}
                  <div>
                    <h3 className="text-md font-medium mb-3">All Insights</h3>
                    <div className="space-y-3">
                      {insights.map((insight) => (
                        <div 
                          key={insight.id}
                          className="flex items-start p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {insight.severity === 'high' ? (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : insight.severity === 'medium' ? (
                              <Info className="h-5 w-5 text-amber-500" />
                            ) : (
                              <BarChart2 className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between">
                              <h4 className="font-medium">{insight.title}</h4>
                              <Badge 
                                variant="outline" 
                                className={`${insight.severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 
                                  insight.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                  'bg-blue-50 text-blue-700 border-blue-200'}`}
                              >
                                {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{insight.description}</p>
                            {insight.action && (
                              <div className="mt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-sm"
                                >
                                  {insight.action}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
