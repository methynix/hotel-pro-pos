import { FC, useEffect, useState } from 'react';
import { MdTrendingUp, MdTrendingDown, MdAccountBalance, MdPending } from 'react-icons/md';
import { analyticsService, DashboardMetrics, CategorySpending, DailyTrend } from '../services/analyticsService';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: FC<{ className?: string }>;
  colorClass: string;
}

const Dashboard: FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topCategories, setTopCategories] = useState<CategorySpending[]>([]);
  const [cashFlow, setCashFlow] = useState<DailyTrend[]>([]);
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getFullDashboardData(timeframe);
        setMetrics(data.metrics);
        setTopCategories(data.topCategories);
        setCashFlow(data.cashFlowTrend);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [timeframe]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  const metricCards: MetricCard[] = [
    {
      title: 'Total Inflows',
      value: `$${metrics.totalInflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      change: `${metrics.inflowsChange >= 0 ? '+' : ''}${metrics.inflowsChange.toFixed(1)}%`,
      isPositive: metrics.inflowsChange >= 0,
      icon: MdTrendingUp,
      colorClass: 'bg-success-50 text-success-600',
    },
    {
      title: 'Total Expenses',
      value: `$${metrics.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      change: `${metrics.expensesChange >= 0 ? '+' : ''}${metrics.expensesChange.toFixed(1)}%`,
      isPositive: metrics.expensesChange <= 0,
      icon: MdTrendingDown,
      colorClass: 'bg-danger-50 text-danger-600',
    },
    {
      title: 'Net Cash Flow',
      value: `$${metrics.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      change: metrics.netCashFlow >= 0 ? 'Positive' : 'Negative',
      isPositive: metrics.netCashFlow >= 0,
      icon: MdAccountBalance,
      colorClass: 'bg-accent-50 text-accent-600',
    },
    {
      title: 'Pending Actions',
      value: metrics.pendingCount.toString(),
      change: `${metrics.transactionCount} total transactions`,
      isPositive: true,
      icon: MdPending,
      colorClass: 'bg-warning-50 text-warning-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Dashboard</h1>
          <p className="text-text-secondary">Welcome to ledgerHQ - Your Financial Intelligence Hub</p>
        </div>
        <div className="flex gap-2">
          {(['month', 'quarter', 'year'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-accent-600 text-white'
                  : 'bg-surface border border-border text-text-primary hover:border-accent-600'
              }`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              className="bg-surface rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-secondary">{metric.title}</h3>
                <div className={`p-2 rounded-lg ${metric.colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mb-3">
                <p className="text-3xl font-bold text-text-primary">{metric.value}</p>
              </div>

              <p className={`text-sm font-medium ${metric.isPositive ? 'text-success-600' : 'text-danger-600'}`}>
                {metric.isPositive ? '↑' : '↓'} {metric.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Spending Categories */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Top Spending Categories</h2>

          {topCategories.length > 0 ? (
            <div className="space-y-4">
              {topCategories.map((cat, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{cat.category}</span>
                    <span className="text-sm font-bold text-text-primary">
                      ${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-danger-500 h-2 rounded-full transition-all"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary">{cat.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">No spending data available</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Quick Actions</h2>

          <div className="space-y-3">
            <a
              href="/app/transactions"
              className="block w-full p-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-center transition-colors shadow-sm hover:shadow-md"
            >
              New Transaction
            </a>
            <a
              href="/app/expenses"
              className="block w-full p-3 bg-warning-500 hover:bg-warning-600 text-white rounded-lg font-medium text-center transition-colors shadow-sm hover:shadow-md"
            >
              Log Expense
            </a>
            <a
              href="/app/reports"
              className="block w-full p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-center transition-colors shadow-sm hover:shadow-md"
            >
              Generate Report
            </a>
            <a
              href="/app/accounts"
              className="block w-full p-3 border-2 border-accent-600 text-accent-600 hover:bg-accent-50 rounded-lg font-medium text-center transition-colors"
            >
              View Accounts
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-xs text-text-secondary mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-text-primary">{metrics.transactionCount}</p>
              </div>
              <div className="p-3 bg-accent-50 rounded-lg">
                <p className="text-xs text-text-secondary mb-1">Account Balance</p>
                <p className="text-2xl font-bold text-text-primary">
                  ${metrics.accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Trend */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-8">
        <h2 className="text-lg font-semibold text-text-primary mb-6">30-Day Cash Flow Trend</h2>
        {cashFlow.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max" style={{ height: '200px', alignItems: 'flex-end' }}>
              {cashFlow.map((day, i) => {
                const maxAmount = Math.max(...cashFlow.flatMap(d => [d.inflow, d.outflow])) || 1;
                const inflowHeight = (day.inflow / maxAmount) * 150;
                const outflowHeight = (day.outflow / maxAmount) * 150;

                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="flex gap-1" style={{ alignItems: 'flex-end' }}>
                      {day.inflow > 0 && (
                        <div
                          className="w-2 bg-success-500 rounded"
                          style={{ height: `${inflowHeight}px` }}
                          title={`Inflow: $${day.inflow.toFixed(2)}`}
                        />
                      )}
                      {day.outflow > 0 && (
                        <div
                          className="w-2 bg-danger-500 rounded"
                          style={{ height: `${outflowHeight}px` }}
                          title={`Outflow: $${day.outflow.toFixed(2)}`}
                        />
                      )}
                    </div>
                    <span className="text-xs text-text-secondary">{day.date.slice(-2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex gap-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success-500 rounded" />
                <span className="text-sm text-text-secondary">Inflow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-danger-500 rounded" />
                <span className="text-sm text-text-secondary">Outflow</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">No transaction data available</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
