import { FC } from 'react';
import { MdTrendingUp, MdTrendingDown, MdAccountBalance, MdPending } from 'react-icons/md';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: FC<{ className?: string }>;
  color: string;
}

const Dashboard: FC = () => {
  // Sample data - replace with real API calls
  const metrics: MetricCard[] = [
    {
      title: 'Total Inflows',
      value: '$45,230.50',
      change: '+12.5%',
      isPositive: true,
      icon: MdTrendingUp,
      color: 'text-success',
    },
    {
      title: 'Total Expenses',
      value: '$12,450.00',
      change: '-8.2%',
      isPositive: false,
      icon: MdTrendingDown,
      color: 'text-danger',
    },
    {
      title: 'Net Cash Flow',
      value: '$32,780.50',
      change: '+18.7%',
      isPositive: true,
      icon: MdAccountBalance,
      color: 'text-accent',
    },
    {
      title: 'Pending Actions',
      value: '5',
      change: '2 new',
      isPositive: true,
      icon: MdPending,
      color: 'text-warning',
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
              className="bg-surface rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-text-secondary">{metric.title}</h3>
                <div className={`p-2 bg-opacity-10 rounded-lg ${metric.color}`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
              </div>

              <div className="mb-2">
                <p className="text-2xl font-bold text-text-primary">{metric.value}</p>
              </div>

              <p
                className={`text-sm ${
                  metric.isPositive ? 'text-success' : 'text-danger'
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
        <div className="lg:col-span-2 bg-surface rounded-xl shadow-md border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Recent Transactions</h2>
            <a href="/app/transactions" className="text-accent hover:underline text-sm font-medium">
              View All
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
                  <p className="font-medium text-text-primary text-sm">{tx.desc}</p>
                  <p className="text-xs text-text-secondary">{tx.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-semibold ${tx.amount.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                    {tx.amount}
                  </p>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      tx.status === 'completed'
                        ? 'bg-green-100 text-success'
                        : 'bg-yellow-100 text-warning'
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
        <div className="bg-surface rounded-xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Quick Actions</h2>

          <div className="space-y-3">
            <a
              href="/app/transactions"
              className="block w-full p-4 bg-gradient-to-r from-accent to-blue-700 text-white rounded-lg hover:shadow-lg transition-shadow text-center font-medium"
            >
              New Transaction
            </a>
            <a
              href="/app/expenses"
              className="block w-full p-4 bg-gradient-to-r from-warning to-orange-500 text-white rounded-lg hover:shadow-lg transition-shadow text-center font-medium"
            >
              Log Expense
            </a>
            <a
              href="/app/reports"
              className="block w-full p-4 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-shadow text-center font-medium"
            >
              Generate Report
            </a>
            <a
              href="/app/accounts"
              className="block w-full p-4 border-2 border-accent text-accent rounded-lg hover:bg-blue-50 transition-colors text-center font-medium"
            >
              View Accounts
            </a>
          </div>

          {/* Stats */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-text-secondary mb-4">This Month</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-secondary mb-1">Transactions</p>
                <p className="text-xl font-bold text-text-primary">24</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Total Volume</p>
                <p className="text-xl font-bold text-text-primary">$156,430</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="bg-surface rounded-xl shadow-md border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-6">Cash Flow Trend</h2>
        <div className="h-64 flex items-center justify-center bg-background rounded-lg">
          <p className="text-text-secondary">Chart coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
