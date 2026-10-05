import { FC, useState, FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MdMail, MdLock, MdPerson } from 'react-icons/md';

// Matches the server-side rule in authController.register.
const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  'w-full pl-10 pr-4 py-3 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all';
const iconClass = 'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary';

const Signup: FC = () => {
  const { register, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
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
      await register(name.trim(), email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent-600" />

      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="mb-10 text-center">
          <div className="mb-6 inline-block p-4 bg-primary-50 rounded-2xl shadow-md">
            <img
              src="/logoHQ.jpg"
              alt="ledgerHQ"
              className="w-16 h-16 rounded-xl object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Create your account</h1>
          <p className="text-text-secondary text-sm font-medium">Get started with ledgerHQ</p>
        </div>

        {/* Signup Card */}
        <div className="bg-surface rounded-2xl shadow-lg p-8 border border-border">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border-l-4 border-danger-500 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-text-primary mb-2">
                Full Name
              </label>
              <div className="relative">
                <MdPerson className={iconClass} />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <MdMail className={iconClass} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <MdLock className={iconClass} />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  className={inputClass}
                />
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                At least {MIN_PASSWORD_LENGTH} characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-primary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <MdLock className={iconClass} />
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-7 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/" className="font-semibold text-accent-600 hover:text-accent-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
