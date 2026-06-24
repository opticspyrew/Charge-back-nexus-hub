import { useState } from "react";
import { Plus, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle, Wallet } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useTransactions } from "@/hooks/use-transactions";
import { useCoinPrices } from "@/hooks/use-coingecko";
import { formatCurrency, formatCrypto, formatPercentage, cn } from "@/lib/formatters";
import { TransactionForm } from "@/components/transaction-form";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Dashboard() {
  const { holdings, transactions } = useTransactions();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const coinIds = holdings.map((h) => h.coinId);
  const { data: prices, isLoading: isPricesLoading, isError: isPricesError } = useCoinPrices(coinIds);

  // Derive portfolio stats
  let totalValue = 0;
  let totalCost = 0;
  let prevDayTotalValue = 0;

  const holdingsWithPrices = holdings.map((h) => {
    const priceData = prices?.find((p) => p.id === h.coinId);
    const currentPrice = priceData?.current_price || 0;
    const priceChangePct = priceData?.price_change_percentage_24h_in_currency || 0;
    
    const marketValue = h.netQuantity * currentPrice;
    const unrealizedPL = marketValue - h.totalCostBasis;
    const unrealizedPLPct = h.totalCostBasis > 0 ? (unrealizedPL / h.totalCostBasis) * 100 : 0;
    
    totalValue += marketValue;
    totalCost += h.totalCostBasis;

    // Estimate yesterday's value for the 24h change calculation
    const prevPrice = currentPrice / (1 + priceChangePct / 100);
    prevDayTotalValue += h.netQuantity * prevPrice;

    return {
      ...h,
      currentPrice,
      priceChangePct,
      marketValue,
      unrealizedPL,
      unrealizedPLPct,
    };
  }).sort((a, b) => b.marketValue - a.marketValue);

  // Final portfolio-level metrics
  const totalUnrealizedPL = totalValue - totalCost;
  const totalUnrealizedPLPct = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;
  
  const dailyChange = totalValue - prevDayTotalValue;
  const dailyChangePct = prevDayTotalValue > 0 ? (dailyChange / prevDayTotalValue) * 100 : 0;

  // Chart data
  const chartData = holdingsWithPrices.map((h, i) => ({
    name: h.symbol.toUpperCase(),
    value: h.marketValue,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter(d => d.value > 0);

  const isEmpty = holdings.length === 0;

  return (
    <Layout>
      <div className="flex flex-col gap-8 pb-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-card-foreground">Overview</h1>
          <Button onClick={() => setIsAddFormOpen(true)} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {isPricesError && (
          <Alert variant="destructive" className="bg-destructive/5 text-destructive border-destructive/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Network Issue</AlertTitle>
            <AlertDescription>
              Live market prices are temporarily unavailable. We're showing the last known data.
            </AlertDescription>
          </Alert>
        )}

        {isEmpty ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-sm">
                <Wallet className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Your portfolio is empty</h2>
              <p className="text-muted-foreground mb-8 max-w-sm text-balance">
                Get started by adding your first transaction. Your data is stored locally and securely.
              </p>
              <Button onClick={() => setIsAddFormOpen(true)}>
                Add your first asset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight font-mono">
                    {isPricesLoading ? <Skeleton className="h-9 w-32" /> : formatCurrency(totalValue)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">24h Change</CardTitle>
                </CardHeader>
                <CardContent>
                  {isPricesLoading ? (
                    <Skeleton className="h-9 w-32" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <div className={cn(
                        "text-3xl font-bold tracking-tight font-mono flex items-center",
                        dailyChange >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {dailyChange >= 0 ? <ArrowUpRight className="w-6 h-6 mr-1" /> : <ArrowDownRight className="w-6 h-6 mr-1" />}
                        {formatCurrency(Math.abs(dailyChange))}
                      </div>
                      <span className={cn("text-sm font-medium", dailyChange >= 0 ? "text-profit" : "text-loss")}>
                        ({dailyChange >= 0 ? "+" : ""}{formatPercentage(dailyChangePct)})
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost Basis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight font-mono">
                    {formatCurrency(totalCost)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unrealized P/L</CardTitle>
                </CardHeader>
                <CardContent>
                  {isPricesLoading ? (
                    <Skeleton className="h-9 w-32" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <div className={cn(
                        "text-3xl font-bold tracking-tight font-mono flex items-center",
                        totalUnrealizedPL >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {totalUnrealizedPL >= 0 ? "+" : "-"}{formatCurrency(Math.abs(totalUnrealizedPL))}
                      </div>
                      <span className={cn("text-sm font-medium", totalUnrealizedPL >= 0 ? "text-profit" : "text-loss")}>
                        ({totalUnrealizedPL >= 0 ? "+" : ""}{formatPercentage(totalUnrealizedPLPct)})
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Holdings Table */}
              <Card className="lg:col-span-2 shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-muted/30 border-b border-border">
                  <CardTitle className="text-base font-semibold">Your Assets</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Unrealized P/L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdingsWithPrices.map((asset) => (
                        <TableRow key={asset.coinId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {asset.image && <img src={asset.image} alt="" className="w-8 h-8 rounded-full shadow-sm" />}
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{asset.name}</span>
                                <span className="text-xs font-mono text-muted-foreground uppercase">{asset.symbol}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {isPricesLoading ? (
                              <div className="flex justify-end"><Skeleton className="h-5 w-16" /></div>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="font-mono">{formatCurrency(asset.currentPrice)}</span>
                                <span className={cn("text-xs font-mono flex items-center mt-0.5", asset.priceChangePct >= 0 ? "text-profit" : "text-loss")}>
                                  {asset.priceChangePct >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                  {Math.abs(asset.priceChangePct).toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-medium">{formatCrypto(asset.netQuantity)}</span>
                              <span className="text-xs text-muted-foreground font-mono mt-0.5">Avg {formatCurrency(asset.averageCostBasis)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {isPricesLoading ? <div className="flex justify-end"><Skeleton className="h-5 w-20" /></div> : formatCurrency(asset.marketValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isPricesLoading ? (
                               <div className="flex justify-end"><Skeleton className="h-5 w-20" /></div>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className={cn("font-mono font-medium", asset.unrealizedPL >= 0 ? "text-profit" : "text-loss")}>
                                  {asset.unrealizedPL >= 0 ? "+" : "-"}{formatCurrency(Math.abs(asset.unrealizedPL))}
                                </span>
                                <span className={cn("text-xs font-mono mt-0.5", asset.unrealizedPL >= 0 ? "text-profit" : "text-loss")}>
                                  {asset.unrealizedPLPct >= 0 ? "+" : "-"}{formatPercentage(Math.abs(asset.unrealizedPLPct))}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Allocation Chart */}
              <Card className="shadow-sm flex flex-col">
                <CardHeader className="bg-muted/30 border-b border-border">
                  <CardTitle className="text-base font-semibold">Allocation</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
                  {isPricesLoading ? (
                    <div className="flex flex-col items-center justify-center h-[300px]">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : totalValue > 0 ? (
                    <>
                      <div className="h-[240px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                              itemStyle={{ color: 'hsl(var(--card-foreground))', fontFamily: 'var(--app-font-mono)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full mt-6 space-y-3">
                        {chartData.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <span className="font-mono text-muted-foreground">
                              {formatPercentage((entry.value / totalValue) * 100)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      No value to display
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <TransactionForm
        open={isAddFormOpen}
        onOpenChange={setIsAddFormOpen}
      />
    </Layout>
  );
}
