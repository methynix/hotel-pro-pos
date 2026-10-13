import { FC, useState, FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/layout/AuthLayout';

// Matches the server-side rule in authController.register.
const MIN_PASSWORD_LENGTH = 8;

const Signup: FC = () => {
  const { register, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password, organizationName.trim());
    } catch (err: any) {
      setError(err?.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set up your business"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/" className="text-text-primary underline underline-offset-4">
            Sign in
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
          <label htmlFor="name" className="block text-xs font-medium text-text-secondary mb-1.5">
            Full name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-sm text-text-primary placeholder:text-secondary-400 focus:border-primary-900 focus:ring-1 focus:ring-primary-900"
          />
        </div>
        <div>
          <label htmlFor="organizationName" className="block text-xs font-medium text-text-secondary mb-1.5">
            Business name
          </label>
          <input
            id="organizationName"
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            autoComplete="organization"
            minLength={2}
            required
            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-sm text-text-primary placeholder:text-secondary-400 focus:border-primary-900 focus:ring-1 focus:ring-primary-900"
          />
        </div>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            required
            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-sm text-text-primary placeholder:text-secondary-400 focus:border-primary-900 focus:ring-1 focus:ring-primary-900"
          />
          <p className="mt-1.5 text-xs text-text-secondary">At least {MIN_PASSWORD_LENGTH} characters</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-text-secondary mb-1.5">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-sm text-text-primary placeholder:text-secondary-400 focus:border-primary-900 focus:ring-1 focus:ring-primary-900"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 bg-primary-900 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isLoading && (
            <span className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isLoading ? 'Creating account' : 'Create account'}
        </button>
        <p className="text-xs text-text-secondary">
          You'll be the administrator of this business and can invite your team afterwards. Joining an existing
          business? Ask its administrator for an invitation link instead.
        </p>
      </form>
    </AuthLayout>
  );
};

export default Signup;
