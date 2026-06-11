import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

interface PriceData {
  usd: number;
  usd_24h_change?: number;
  sparkline_in_7d?: { price: number[] };
}

interface CryptoPriceCardProps {
  prices: Record<string, PriceData>;
}

export function CryptoPriceCard({ prices }: CryptoPriceCardProps) {
  if (!prices || Object.keys(prices).length === 0) return null;

  return (
    <div className="grid gap-4 w-full max-w-2xl grid-cols-1 sm:grid-cols-2">
      {Object.entries(prices).map(([id, data]) => {
        const isPositive = (data.usd_24h_change || 0) >= 0;
        const chartData = data.sparkline_in_7d?.price.map((p, i) => ({ i, p })) || [];
        
        return (
          <Card key={id} className="bg-gb-dark border-gb-dark overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gb-accent uppercase tracking-widest">
                    {id.replace(/-/g, ' ')}
                  </span>
                  <span className="text-2xl font-bold text-gb-light mt-1">
                    ${(data.usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                </div>
                {data.usd_24h_change !== undefined && (
                  <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {Math.abs(data.usd_24h_change).toFixed(2)}%
                  </div>
                )}
              </div>
              
              {chartData.length > 0 && (
                <div className="h-16 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis domain={['dataMin', 'dataMax']} hide />
                      <Area
                        type="monotone"
                        dataKey="p"
                        stroke={isPositive ? '#10b981' : '#f43f5e'}
                        strokeWidth={2}
                        fill={`url(#gradient-${id})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
