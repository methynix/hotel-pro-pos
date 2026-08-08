import { FC } from 'react';
import { MdTrendingUp, MdTrendingDown, MdAccountBalance, MdPending } from 'react-icons/md';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: FC<{ className?: string }>;
  colorClass: string;
}

const Dashboard: FC = () => {
  const metrics: MetricCard[] = [
    {
      title: 'Total Inflows',
      value: '$45,230.50',
      change: '+12.5%',
      isPositive: true,
      icon: MdTrendingUp,
      colorClass: 'bg-success-50 text-success-600',
    },
    {
      title: 'Total Expenses',
      value: '$12,450.00',
      change: '-8.2%',
      isPositive: false,
      icon: MdTrendingDown,
      colorClass: 'bg-danger-50 text-danger-600',
    },
    {
      title: 'Net Cash Flow',
      value: '$32,780.50',
      change: '+18.7%',
      isPositive: true,
      icon: MdAccountBalance,
      colorClass: 'bg-accent-50 text-accent-600',
    },
    {
      title: 'Pending Actions',
      value: '5',
      change: '2 new',
      isPositive: true,
      icon: MdPending,
      colorClass: 'bg-warning-50 text-warning-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">Welcome to ledgerHQ - Your Financial Intelligence Hub</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
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

              <p
                className={`text-sm font-medium ${
                  metric.isPositive ? 'text-success-600' : 'text-danger-600'
                }`}
              >
                {metric.isPositive ? '↑' : '↓'} {metric.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Recent Transactions</h2>
            <a href="/app/transactions" className="text-accent-600 hover:text-accent-700 text-sm font-medium">
              View All →
            </a>
          </div>

          <div className="space-y-4">
            {[
              { date: 'Today', amount: '+$1,250', desc: 'Client Payment', status: 'completed' },
              { date: 'Yesterday', amount: '-$450', desc: 'Expense Reimbursement', status: 'completed' },
              { date: '2 days ago', amount: '+$3,200', desc: 'Invoice Payment', status: 'completed' },
              { date: '3 days ago', amount: '-$200', desc: 'Supplier Payment', status: 'pending' },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between pb-4 border-b border-border last:border-0">
                <div>
                  <p className="font-semibold text-text-primary text-sm">{tx.desc}</p>
                  <p className="text-xs text-text-secondary">{tx.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-semibold text-sm ${tx.amount.startsWith('+') ? 'text-success-600' : 'text-danger-600'}`}>
                    {tx.amount}
                  </p>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      tx.status === 'completed'
                        ? 'bg-success-100 text-success-700'
                        : 'bg-warning-100 text-warning-700'
                    }`}
                  >
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
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

          {/* Stats */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-4">This Month</h3>
            <div className="space-y-4">
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-xs text-text-secondary mb-1">Transactions</p>
                <p className="text-2xl font-bold text-text-primary">24</p>
              </div>
              <div className="p-3 bg-accent-50 rounded-lg">
                <p className="text-xs text-text-secondary mb-1">Total Volume</p>
                <p className="text-2xl font-bold text-text-primary">$156,430</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-8">
        <h2 className="text-lg font-semibold text-text-primary mb-6">Cash Flow Trend</h2>
        <div className="h-64 flex items-center justify-center bg-background rounded-lg border border-border border-dashed">
          <p className="text-text-secondary">Analytics coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
