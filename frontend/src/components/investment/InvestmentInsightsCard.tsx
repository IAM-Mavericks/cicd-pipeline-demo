import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertCircle, Info, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type InsightSeverity = 'high' | 'medium' | 'low';

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  action?: string;
}

interface InvestmentInsightsCardProps {
  portfolioValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  insights: Insight[];
  onViewPortfolio: () => void;
}

export function InvestmentInsightsCard({
  portfolioValue,
  dailyChange,
  dailyChangePercent,
  insights = [],
  onViewPortfolio,
}: InvestmentInsightsCardProps) {
  const isPositive = dailyChange >= 0;
  const severityColors = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const severityIcons = {
    high: <AlertCircle className="h-4 w-4 mr-1" />,
    medium: <Info className="h-4 w-4 mr-1" />,
    low: <BarChart2 className="h-4 w-4 mr-1" />,
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Investment Insights</CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <BarChart2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Portfolio Summary */}
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              ₦{portfolioValue.toLocaleString('en-NG')}
            </div>
            <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {dailyChange >= 0 ? '+' : ''}
              {dailyChange.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {' '}({dailyChangePercent >= 0 ? '+' : ''}{dailyChangePercent.toFixed(2)}%)
              <span className="text-gray-500 ml-2">Today</span>
            </div>
          </div>

          {/* Insights List */}
          {insights.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Key Insights</h4>
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div 
                    key={insight.id}
                    className={`flex items-start p-3 rounded-md border ${severityColors[insight.severity]}`}
                  >
                    <div className="flex-shrink-0">
                      {severityIcons[insight.severity]}
                    </div>
                    <div className="ml-2">
                      <div className="text-sm font-medium">{insight.title}</div>
                      <p className="text-xs text-gray-600">{insight.description}</p>
                      {insight.action && (
                        <button 
                          className="text-xs mt-1 text-blue-600 hover:underline"
                          onClick={() => {}}
                        >
                          {insight.action}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No insights available. Complete your portfolio setup to get personalized recommendations.
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onViewPortfolio}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            View Full Portfolio Analysis
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default InvestmentInsightsCard;
