import { FC, ReactNode } from 'react';
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import { Report } from '../../types';
import { useFormatters } from '../../hooks/useFormatters';

export type ReportType = Report['type'];

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReportData = Record<string, any>;

const Metric: FC<{ label: string; value: string; tone?: 'success' | 'danger' | 'accent' | 'warning' | 'info' }> = ({
  label,
  value,
  tone = 'accent',
}) => {
  const tones = {
    success: 'bg-success-50 text-success-700',
    danger: 'bg-danger-50 text-danger-700',
    accent: 'bg-accent-50 text-accent-700',
    warning: 'bg-warning-50 text-warning-700',
    info: 'bg-info-50 text-info-700',
  };
  return (
    <div className={`p-4 rounded-lg ${tones[tone].split(' ')[0]}`}>
      <p className="text-xs font-medium text-text-secondary mb-1">{label}</p>
      <p className={`text-xl md:text-2xl font-bold ${tones[tone].split(' ')[1]}`}>{value}</p>
    </div>
  );
};

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
    {children}
  </section>
);

/** Two-column statement table, e.g. "Revenue ..... $1,000". */
const Statement: FC<{ rows: { label: string; value: string; strong?: boolean; tone?: string }[] }> = ({ rows }) => (
  <div className="border border-border rounded-lg divide-y divide-border">
    {rows.map((row) => (
      <div
        key={row.label}
        className={`flex items-center justify-between px-4 py-3 text-sm ${row.strong ? 'bg-background font-semibold' : ''}`}
      >
        <span className="text-text-primary">{row.label}</span>
        <span className={`tabular-nums ${row.tone || 'text-text-primary'}`}>{row.value}</span>
      </div>
    ))}
  </div>
);

const CategoryBreakdown: FC<{ title: string; entries: Record<string, number>; tone: 'success' | 'danger' }> = ({
  title,
  entries,
  tone,
}) => {
  const fmt = useFormatters();
  const items = Object.entries(entries || {}).sort((a, b) => b[1] - a[1]);
  const total = items.reduce((s, [, v]) => s + v, 0) || 1;
  const Icon = tone === 'success' ? MdArrowUpward : MdArrowDownward;

  return (
    <div className="border border-border rounded-lg p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-4">
        <Icon className={`w-4 h-4 ${tone === 'success' ? 'text-success-600' : 'text-danger-600'}`} />
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">No activity in this period</p>
      ) : (
        <div className="space-y-3">
          {items.map(([name, amount]) => (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-primary">{name}</span>
                <span className="font-medium tabular-nums">{fmt.money(amount)}</span>
              </div>
              <div className="h-1.5 bg-background rounded-full">
                <div
                  className={`h-1.5 rounded-full ${tone === 'success' ? 'bg-success-500' : 'bg-danger-500'}`}
                  style={{ width: `${(amount / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const IncomeView: FC<{ data: ReportData }> = ({ data }) => {
  const fmt = useFormatters();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Revenue" value={fmt.money(data.revenues)} tone="success" />
        <Metric label="Expenses" value={fmt.money(data.expenses)} tone="danger" />
        <Metric label="Net Income" value={fmt.money(data.netIncome)} tone={data.netIncome >= 0 ? 'accent' : 'danger'} />
      </div>
      <Statement
        rows={[
          { label: 'Total revenue', value: fmt.money(data.revenues) },
          { label: 'Total expenses', value: `(${fmt.money(data.expenses)})`, tone: 'text-danger-600' },
          {
            label: 'Net income',
            value: fmt.money(data.netIncome),
            strong: true,
            tone: data.netIncome >= 0 ? 'text-success-700' : 'text-danger-700',
          },
          { label: 'Profit margin', value: `${Number(data.margin || 0).toFixed(2)}%` },
        ]}
      />
    </div>
  );
};

const CashFlowView: FC<{ data: ReportData }> = ({ data }) => {
  const fmt = useFormatters();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Operating Cash Flow" value={fmt.money(data.operatingCashFlow)} tone="info" />
        <Metric label="Pending Cash Flow" value={fmt.money(data.pendingCashFlow)} tone="warning" />
        <Metric label="Total Cash Flow" value={fmt.money(data.totalCashFlow)} tone={data.totalCashFlow >= 0 ? 'success' : 'danger'} />
      </div>
      <Statement
        rows={[
          { label: 'Completed transactions (net)', value: fmt.money(data.operatingCashFlow) },
          { label: 'Pending transactions (net)', value: fmt.money(data.pendingCashFlow) },
          { label: 'Total cash flow', value: fmt.money(data.totalCashFlow), strong: true },
          { label: 'Transactions in period', value: String(data.transactionCount ?? 0) },
        ]}
      />
    </div>
  );
};

const BalanceView: FC<{ data: ReportData }> = ({ data }) => {
  const fmt = useFormatters();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Total Assets" value={fmt.money(data.assets)} tone="success" />
        <Metric label="Total Liabilities" value={fmt.money(data.liabilities)} tone="danger" />
        <Metric label="Equity" value={fmt.money(data.equity)} tone="accent" />
      </div>
      <Statement
        rows={[
          { label: 'Assets (checking and savings)', value: fmt.money(data.assets) },
          { label: 'Liabilities (credit)', value: `(${fmt.money(data.liabilities)})`, tone: 'text-danger-600' },
          { label: "Owner's equity", value: fmt.money(data.equity), strong: true },
          { label: 'Accounts included', value: String(data.accountCount ?? 0) },
        ]}
      />
    </div>
  );
};

const TaxView: FC<{ data: ReportData }> = ({ data }) => {
  const fmt = useFormatters();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Taxable Income" value={fmt.money(data.totalIncome)} tone="success" />
        <Metric label="Deductible Expenses" value={fmt.money(data.totalExpenses)} tone="danger" />
        <Metric label="Net" value={fmt.money((data.totalIncome || 0) - (data.totalExpenses || 0))} tone="accent" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryBreakdown title="Income by category" entries={data.incomeByCategory} tone="success" />
        <CategoryBreakdown title="Expenses by category" entries={data.expensesByCategory} tone="danger" />
      </div>
    </div>
  );
};

const SummaryView: FC<{ data: ReportData }> = ({ data }) => (
  <div className="space-y-8">
    {data.incomeStatement && (
      <Section title="Income Statement">
        <IncomeView data={data.incomeStatement} />
      </Section>
    )}
    {data.cashFlow && (
      <Section title="Cash Flow">
        <CashFlowView data={data.cashFlow} />
      </Section>
    )}
    {data.balanceSheet && (
      <Section title="Balance Sheet">
        <BalanceView data={data.balanceSheet} />
      </Section>
    )}
    {data.taxSummary && (
      <Section title="Tax Summary">
        <TaxView data={data.taxSummary} />
      </Section>
    )}
  </div>
);

const ReportView: FC<{ type: ReportType; data: ReportData }> = ({ type, data }) => {
  switch (type) {
    case 'income':
      return <IncomeView data={data} />;
    case 'cash_flow':
      return <CashFlowView data={data} />;
    case 'balance':
      return <BalanceView data={data} />;
    case 'tax':
      return <TaxView data={data} />;
    case 'summary':
      return <SummaryView data={data} />;
    default:
      return <p className="text-sm text-text-secondary">This report type cannot be displayed.</p>;
  }
};

export default ReportView;
