import { FC, useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MdMail, MdLock } from 'react-icons/md';

const Login: FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent-600" />

      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-block p-4 bg-primary-50 rounded-2xl shadow-md">
            <img
              src="/logoHQ.jpg"
              alt="ledgerHQ"
              className="w-16 h-16 rounded-xl object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">ledgerHQ</h1>
          <p className="text-text-secondary text-sm font-medium">Financial Management Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface rounded-2xl shadow-lg p-8 border border-border">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border-l-4 border-danger-500 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <MdMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ledgerhq.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-7 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer Section */}
        <div className="mt-8 text-center">
          <p className="text-text-secondary text-sm mb-4">Demo Credentials Available</p>
          <div className="bg-surface border border-border rounded-lg p-4 text-left text-xs space-y-2">
            <div>
              <p className="font-semibold text-text-primary">Admin Account</p>
              <p className="text-text-secondary">admin@ledgerhq.com / Admin123!@#</p>
            </div>
            <div className="border-t border-border pt-2">
              <p className="font-semibold text-text-primary">Manager Account</p>
              <p className="text-text-secondary">manager@ledgerhq.com / Manager123!@#</p>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="mt-6 text-center text-xs text-text-secondary space-y-2">
          <div className="flex justify-center gap-3">
            <a href="/privacy" className="hover:text-accent-600 transition-colors font-medium">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-accent-600 transition-colors font-medium">
              Terms
            </a>
          </div>
          <p className="pt-2 text-xs text-text-secondary">© 2026 ledgerHQ. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
