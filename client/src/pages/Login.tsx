import { FC, useState, FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/layout/AuthLayout';

const Login: FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  // Only follow same-site paths, so the link can't bounce users elsewhere.
  const next = params.get('next');
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle={
        <>
          New to ledgerHQ?{' '}
          <Link to="/signup" className="text-text-primary underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-5 border-l-2 border-danger-500 bg-danger-50 px-3 py-2 text-sm text-danger-800">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-sm text-text-primary placeholder:text-secondary-400 focus:border-primary-900 focus:ring-1 focus:ring-primary-900"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-sm text-text-primary placeholder:text-secondary-400 focus:border-primary-900 focus:ring-1 focus:ring-primary-900"
          />
        </div>
        <label htmlFor="rememberMe" className="flex items-center gap-2 cursor-pointer select-none pt-1">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded-sm border-secondary-300 text-primary-900 focus:ring-primary-900"
          />
          <span className="text-sm text-text-secondary">Keep me signed in on this device</span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 bg-primary-900 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isLoading && (
            <span className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isLoading ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
