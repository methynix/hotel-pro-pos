import { FC, FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MdErrorOutline } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { useAsyncData } from '../hooks/useAsyncData';
import { invitationService } from '../services/invitationService';
import { InvitationPreview } from '../types';
import { ROLE_DESCRIPTIONS } from '../utils/permissions';
import { errorMessage } from '../utils/format';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/FormField';
import { Skeleton } from '../components/ui/Skeleton';

const MIN_PASSWORD_LENGTH = 8;

const ErrorNote: FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="mb-5 border-l-2 border-danger-500 bg-danger-50 px-3 py-2 text-sm text-danger-800">
    {message}
  </p>
);

const AcceptInvite: FC = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, startSession, setUser, logout } = useAuth();

  const { data: invite, loading, error } = useAsyncData<InvitationPreview | null>(
    () => invitationService.preview(token),
    null,
    [token]
  );

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await invitationService.acceptAsNewUser(token, name.trim(), password);
      startSession(response.data);
      navigate('/app', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, 'Could not accept the invitation'));
      setSubmitting(false);
    }
  };

  const join = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      setUser(await invitationService.join(token));
      // Full reload so every page starts fresh in the newly joined organization.
      window.location.assign('/app');
    } catch (err) {
      setFormError(errorMessage(err, 'Could not accept the invitation'));
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <AuthLayout title="Invitation" subtitle="Checking your invitation">
        <div className="space-y-3" role="status" aria-label="Loading">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full mt-6" />
        </div>
      </AuthLayout>
    );
  }

  if (error || !invite) {
    return (
      <AuthLayout
        title="Invitation unavailable"
        subtitle={
          <>
            Go to{' '}
            <Link to="/" className="text-text-primary underline underline-offset-4">
              sign in
            </Link>
          </>
        }
      >
        <div className="flex gap-3 text-sm text-text-secondary">
          <MdErrorOutline className="w-5 h-5 text-danger-600 shrink-0" />
          <p>
            This link has expired, was revoked, or has already been used. Ask your administrator to send a new
            invitation.
          </p>
        </div>
      </AuthLayout>
    );
  }

  const summary = (
    <div className="mb-6 border border-border rounded-md divide-y divide-border text-sm">
      <div className="flex justify-between gap-4 px-4 py-2.5">
        <span className="text-text-secondary">Business</span>
        <span className="font-medium text-text-primary text-right">{invite.organizationName}</span>
      </div>
      <div className="flex justify-between gap-4 px-4 py-2.5">
        <span className="text-text-secondary">Role</span>
        <span className="text-right">
          <span className="font-medium text-text-primary capitalize">{invite.role}</span>
          <span className="block text-xs text-text-secondary">{ROLE_DESCRIPTIONS[invite.role]}</span>
        </span>
      </div>
      <div className="flex justify-between gap-4 px-4 py-2.5">
        <span className="text-text-secondary">Invited</span>
        <span className="text-text-primary text-right">{invite.email}</span>
      </div>
    </div>
  );

  const title = `Join ${invite.organizationName}`;
  const subtitle = invite.invitedBy ? `${invite.invitedBy} invited you to ledgerHQ` : 'You have been invited to ledgerHQ';

  // Signed in already: join directly if it's the invited account.
  if (isAuthenticated && user) {
    const isInvitee = user.email.toLowerCase() === invite.email.toLowerCase();
    return (
      <AuthLayout title={title} subtitle={subtitle}>
        {summary}
        {formError && <ErrorNote message={formError} />}
        {isInvitee ? (
          <Button className="w-full" loading={submitting} onClick={join}>
            Accept and join
          </Button>
        ) : (
          <div className="space-y-4 text-sm text-text-secondary">
            <p>
              You're signed in as <span className="text-text-primary">{user.email}</span>, but this invitation is for{' '}
              <span className="text-text-primary">{invite.email}</span>.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => logout()}>
              Sign out and switch account
            </Button>
          </div>
        )}
      </AuthLayout>
    );
  }

  // Has an account but isn't signed in: sign in, then come back here.
  if (invite.existingUser) {
    return (
      <AuthLayout title={title} subtitle={subtitle}>
        {summary}
        <p className="mb-4 text-sm text-text-secondary">
          {invite.email} already has a ledgerHQ account. Sign in to accept.
        </p>
        <Link
          to={`/?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="w-full h-9 inline-flex items-center justify-center rounded-md bg-primary-900 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
        >
          Sign in to accept
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {summary}
      {formError && <ErrorNote message={formError} />}
      <form onSubmit={createAccount} className="space-y-4">
        <Field label="Full name" htmlFor="invite-name" required>
          <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </Field>
        <Field label="Choose a password" htmlFor="invite-password" hint={`At least ${MIN_PASSWORD_LENGTH} characters`} required>
          <Input
            id="invite-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>
          Create account and join
        </Button>
      </form>
    </AuthLayout>
  );
};

export default AcceptInvite;
