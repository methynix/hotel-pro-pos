import { FC, FormEvent, useState } from 'react';
import { MdOutlineBusiness } from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import { organizationService } from '../../services/organizationService';
import { errorMessage } from '../../utils/format';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import { Field, Input } from '../ui/FormField';

/**
 * Shown to a signed-in user who isn't a member of any organization, e.g.
 * after being removed from their only one. They can found a new one, or
 * wait for an invitation.
 */
const NoOrganization: FC = () => {
  const { user, logout } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await organizationService.create(name.trim());
      window.location.assign('/app');
    } catch (err) {
      setError(errorMessage(err, 'Could not create the organization'));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md panel p-8">
        <MdOutlineBusiness className="w-7 h-7 text-text-secondary mb-4" />
        <h1 className="text-xl font-semibold text-text-primary">You're not part of a business yet</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Signed in as {user?.email}. Ask an administrator to invite you, or set up a new business of your own.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <Field label="Business name" htmlFor="org-name" required>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Create business
            </Button>
            <Button variant="ghost" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoOrganization;
