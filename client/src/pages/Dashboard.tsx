import { FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAdd, MdArrowForward } from 'react-icons/md';
import { analyticsService, DashboardMetrics, CategorySpending, DailyTrend } from '../services/analyticsService';
import { useAuth } from '../hooks/useAuth';
import { useFormatters } from '../hooks/useFormatters';
import { usePermissions } from '../hooks/usePermissions';
import { errorMessage } from '../utils/format';
import ErrorBanner from '../components/ui/ErrorBanner';
import StatCard, { StatStrip } from '../components/ui/StatCard';
import { Skeleton, SkeletonHeader, SkeletonStatCards } from '../components/ui/Skeleton';

type Timeframe = 'month' | 'quarter' | 'year';

const TIMEFRAMES: { id: Timeframe; label: string; previous: string }[] = [
  { id: 'month', label: 'Month', previous: 'last month' },
  { id: 'quarter', label: 'Quarter', previous: 'last quarter' },
  { id: 'year', label: 'Year', previous: 'last year' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const DashboardSkeleton: FC = () => (
  <div className="space-y-8" role="status" aria-label="Loading overview">
    <SkeletonHeader />
    <SkeletonStatCards />
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 panel p-5">
        <Skeleton className="h-4 w-40 mb-6" />
        <div className="flex items-end gap-1.5 h-48">
          {Array.from({ length: 30 }).map((_, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${20 + ((i * 37) % 75)}%` }} />
          ))}
        </div>
      </div>
      <div className="xl:col-span-2 panel p-5 space-y-4">
        <Skeleton className="h-4 w-36 mb-2" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Paired daily bars: inflow in ledger green, outflow in ink grey. */
const CashFlowChart: FC<{ data: DailyTrend[]; money: (n: number) => string }> = ({ data, money }) => {
  const max = Math.max(...data.flatMap((d) => [d.inflow, d.outflow]), 0) || 1;
  const totals = data.reduce((acc, d) => ({ inflow: acc.inflow + d.inflow, outflow: acc.outflow + d.outflow }), {
    inflow: 0,
    outflow: 0,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-5 text-sm">
        <span className="flex items-center gap-2 text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-600" />
          In <span className="font-mono tabular text-text-primary">{money(totals.inflow)}</span>
        </span>
        <span className="flex items-center gap-2 text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm bg-secondary-400" />
          Out <span className="font-mono tabular text-text-primary">{money(totals.outflow)}</span>
        </span>
      </div>
      <div className="relative h-48">
        {[0.25, 0.5, 0.75].map((f) => (
          <div
            key={f}
            className="absolute inset-x-0 border-t border-dashed border-border"
            style={{ bottom: `${f * 100}%` }}
          />
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px] border-b border-secondary-300">
          {data.map((day) => (
            <div
              key={day.date}
              className="group relative flex-1 h-full flex items-end justify-center gap-px"
              title={`${day.date}\nIn: ${money(day.inflow)}\nOut: ${money(day.outflow)}`}
            >
              <div
                className="w-1/2 max-w-[10px] bg-accent-600 group-hover:bg-accent-700 rounded-t-[1px]"
                style={{ height: `${(day.inflow / max) * 100}%` }}
              />
              <div
                className="w-1/2 max-w-[10px] bg-secondary-400 group-hover:bg-secondary-500 rounded-t-[1px]"
                style={{ height: `${(day.outflow / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-2 text-xs text-text-secondary font-mono tabular">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
};

const Dashboard: FC = () => {
  const { user } = useAuth();
  const fmt = useFormatters();
  const perms = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topCategories, setTopCategories] = useState<CategorySpending[]>([]);
  const [cashFlow, setCashFlow] = useState<DailyTrend[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('month');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await analyticsService.getFullDashboardData(timeframe);
        setMetrics(data.metrics);
        setTopCategories(data.topCategories || []);
        setCashFlow(data.cashFlowTrend || []);
      } catch (err) {
        setError(errorMessage(err, 'Failed to load dashboard data'));
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [timeframe, reloadKey]);

  const hasCashFlow = useMemo(() => cashFlow.some((d) => d.inflow > 0 || d.outflow > 0), [cashFlow]);

  if (loading) return <DashboardSkeleton />;

  if (!metrics) {
    return (
      <ErrorBanner message={error || 'Dashboard data is unavailable'} onRetry={() => setReloadKey((k) => k + 1)} />
    );
  }

  const previous = TIMEFRAMES.find((t) => t.id === timeframe)?.previous;
  const change = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}% vs ${previous}`;
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {metrics.pendingCount > 0 ? (
              <>
                {metrics.pendingCount} pending {metrics.pendingCount === 1 ? 'item needs' : 'items need'} attention.{' '}
                <Link
                  to="/app/transactions"
                  className="text-text-primary underline underline-offset-4 decoration-border hover:decoration-text-primary"
                >
                  Review
                </Link>
              </>
            ) : (
              'Nothing is waiting on you.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 bg-secondary-100 rounded-md" role="tablist" aria-label="Timeframe">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                role="tab"
                aria-selected={timeframe === tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 h-8 rounded text-sm transition-colors ${
                  timeframe === tf.id
                    ? 'bg-surface text-text-primary font-medium border border-border'
                    : 'text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          {perms.canCreate && (
            <Link
              to="/app/transactions"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary-900 text-white text-sm font-medium hover:bg-primary-700"
            >
              <MdAdd className="w-4 h-4" />
              Record
            </Link>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <StatStrip>
        <StatCard label="Money in" value={fmt.money(metrics.totalInflows)} hint={change(metrics.inflowsChange)} />
        <StatCard label="Money out" value={fmt.money(metrics.totalExpenses)} hint={change(metrics.expensesChange)} />
        <StatCard
          label="Net cash flow"
          value={fmt.money(metrics.netCashFlow)}
          tone={metrics.netCashFlow >= 0 ? 'success' : 'danger'}
          hint={`${metrics.transactionCount} transactions`}
        />
        <StatCard label="Account balance" value={fmt.money(metrics.accountBalance)} hint="Across all accounts" />
      </StatStrip>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="xl:col-span-3 panel p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Cash flow, last 30 days</h2>
            <Link to="/app/reports" className="text-xs text-text-secondary hover:text-text-primary">
              Full report
            </Link>
          </div>
          {hasCashFlow ? (
            <CashFlowChart data={cashFlow} money={fmt.money} />
          ) : (
            <p className="py-16 text-sm text-text-secondary">No transactions in the last 30 days.</p>
          )}
        </section>

        <section className="xl:col-span-2 panel overflow-hidden">
          <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-semibold text-text-primary">Where the money went</h2>
            <Link to="/app/expenses" className="text-xs text-text-secondary hover:text-text-primary">
              Expenses
            </Link>
          </div>
          {topCategories.length > 0 ? (
            <ul className="divide-y divide-border border-t border-border">
              {topCategories.map((cat) => (
                <li key={cat.category} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-text-primary truncate">{cat.category}</span>
                    <span className="font-mono tabular text-sm text-text-primary">{fmt.money(cat.amount)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1 bg-secondary-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-700" style={{ width: `${Math.min(cat.percentage, 100)}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono tabular text-xs text-text-secondary">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-sm text-text-secondary">No spending recorded for this period.</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden">
        {[
          { to: '/app/reports', title: 'Reports', text: 'Income statement, cash flow, balance sheet' },
          { to: '/app/budgets', title: 'Budgets', text: 'Spending limits and alerts by category' },
          { to: '/app/accounts', title: 'Accounts', text: 'Balances across bank and credit accounts' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group bg-surface px-5 py-4 hover:bg-secondary-50 transition-colors"
          >
            <span className="flex items-center justify-between text-sm font-medium text-text-primary">
              {item.title}
              <MdArrowForward className="w-4 h-4 text-secondary-400 group-hover:text-text-primary group-hover:translate-x-0.5 transition-transform" />
            </span>
            <span className="block mt-0.5 text-xs text-text-secondary">{item.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
