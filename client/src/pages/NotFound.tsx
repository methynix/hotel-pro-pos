import { FC } from 'react';
import { Link } from 'react-router-dom';

const NotFound: FC = () => (
  <div className="min-h-screen bg-background flex items-center px-6 sm:px-16">
    <div className="max-w-md">
      <p className="font-mono text-sm text-text-secondary">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-text-primary">This page isn't in the books</h1>
      <p className="mt-2 text-sm text-text-secondary">The link may be old, or the page may have moved.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center h-9 px-3.5 rounded-md bg-primary-900 text-white text-sm font-medium hover:bg-primary-700"
      >
        Back to ledgerHQ
      </Link>
    </div>
  </div>
);

export default NotFound;
