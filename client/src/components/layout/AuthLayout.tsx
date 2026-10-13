import { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}

// A few illustrative ledger lines for the decorative side panel.
const SAMPLE_ROWS = [
  { date: '02 Oct', memo: 'Supplier payment', amount: '-1,250,000' },
  { date: '03 Oct', memo: 'Client invoice 0412', amount: '4,800,000' },
  { date: '05 Oct', memo: 'Office rent', amount: '-900,000' },
  { date: '07 Oct', memo: 'Mobile money receipts', amount: '2,315,500' },
];

const AuthLayout: FC<AuthLayoutProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen grid lg:grid-cols-[1fr_520px] bg-background">
    <div className="flex flex-col px-6 sm:px-12 py-8">
      <Link to="/" className="flex items-baseline gap-0.5 text-text-primary self-start">
        <span className="text-lg font-semibold tracking-tight">ledger</span>
        <span className="text-lg font-semibold tracking-tight text-accent-600">HQ</span>
      </Link>

      <div className="flex-1 flex items-center">
        <div className="w-full max-w-sm mx-auto lg:mx-0 lg:ml-[12%] py-12">
          <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
          <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <footer className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-secondary">
        <span>&copy; 2026 Methynix Software</span>
        <Link to="/privacy" className="hover:text-text-primary">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-text-primary">
          Terms
        </Link>
        <a href="mailto:info@methynix.com" className="hover:text-text-primary">
          info@methynix.com
        </a>
        <a href="tel:0715455422" className="hover:text-text-primary">
          0715 455 422
        </a>
      </footer>
    </div>

    <aside className="hidden lg:flex flex-col justify-between bg-primary-900 text-secondary-200 px-12 py-10">
      <p className="text-sm text-secondary-400">Bookkeeping for Tanzanian businesses</p>
      <div>
        <p className="text-3xl leading-tight font-medium text-white max-w-xs">Every shilling, accounted for.</p>
        <div className="mt-10 font-mono text-sm border-t border-primary-700">
          {SAMPLE_ROWS.map((row) => (
            <div key={row.memo} className="grid grid-cols-[64px_1fr_auto] gap-4 py-2.5 border-b border-primary-700">
              <span className="text-secondary-500">{row.date}</span>
              <span className="text-secondary-300 truncate font-sans">{row.memo}</span>
              <span className={row.amount.startsWith('-') ? 'text-secondary-400' : 'text-accent-300'}>
                {row.amount}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[64px_1fr_auto] gap-4 py-2.5 text-white">
            <span />
            <span className="font-sans">Balance</span>
            <span>4,965,500</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-secondary-500">Amounts in TSh</p>
    </aside>
  </div>
);

export default AuthLayout;
