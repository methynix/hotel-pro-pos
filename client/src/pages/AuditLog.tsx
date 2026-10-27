import { FC, useMemo, useState } from 'react';
import { MdHistory, MdOutlineInfo } from 'react-icons/md';
import { auditService } from '../services/auditService';
import { AuditLogEntry } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { useFormatters } from '../hooks/useFormatters';
import PageHeader from '../components/ui/PageHeader';
import IconButton from '../components/ui/IconButton';
import Badge, { BadgeTone } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Pagination from '../components/ui/Pagination';
import { Select } from '../components/ui/FormField';
import { SkeletonHeader, SkeletonTable } from '../components/ui/Skeleton';

const PAGE_SIZE = 50;

const ENTITY_LABELS: Record<string, string> = {
  transaction: 'Transactions',
  expense: 'Expenses',
  account: 'Accounts',
  category: 'Categories',
  budget: 'Budgets',
  recurring: 'Recurring',
  member: 'Team',
  invitation: 'Invitations',
  organization: 'Business',
};

/** Colour the verb: money-reversing and destructive actions stand out. */
const actionTone = (action: string): BadgeTone => {
  if (/voided|deleted|removed|rejected|revoked/.test(action)) return 'danger';
  if (/paid|approved|joined/.test(action)) return 'success';
  if (/updated|role_changed|paused|resumed/.test(action)) return 'warning';
  return 'info';
};

const actionLabel = (action: string) => action.split('.').pop()!.replace(/_/g, ' ');

// Fields that are bookkeeping noise when comparing versions of a record.
const IGNORED = new Set(['_id', 'id', 'organizationId', 'createdBy', 'createdAt', 'updatedAt', '__v', 'voidedBy', 'reviewedBy', 'paidBy']);

interface BalanceChange {
  account: string;
  before: number;
  after: number;
}

/** Flattens a snapshot that may wrap the record as { transaction, balances }. */
const unwrap = (snap?: Record<string, unknown> | null) => {
  if (!snap) return { record: null as Record<string, unknown> | null, balances: [] as BalanceChange[] };
  const record = (snap.transaction as Record<string, unknown>) ?? snap;
  return { record, balances: (snap.balances as BalanceChange[]) ?? [] };
};

const display = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const Details: FC<{ entry: AuditLogEntry }> = ({ entry }) => {
  const fmt = useFormatters();
  const before = unwrap(entry.before);
  const after = unwrap(entry.after);

  const rows = useMemo(() => {
    const keys = new Set([...Object.keys(before.record ?? {}), ...Object.keys(after.record ?? {})]);
    return [...keys]
      .filter((k) => !IGNORED.has(k))
      .map((k) => ({ key: k, before: before.record?.[k], after: after.record?.[k] }))
      .filter((r) => !before.record || !after.record || display(r.before) !== display(r.after));
  }, [before.record, after.record]);

  const balances = after.balances.length ? after.balances : before.balances;
  const mode = before.record && after.record ? 'changed' : after.record ? 'created' : before.record ? 'removed' : null;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
        <dt className="text-text-secondary">When</dt>
        <dd className="text-text-primary">{new Date(entry.createdAt).toLocaleString('en-GB')}</dd>
        <dt className="text-text-secondary">Who</dt>
        <dd className="text-text-primary">
          {entry.userName}
          {entry.userEmail && <span className="text-text-secondary"> ({entry.userEmail})</span>}
        </dd>
        <dt className="text-text-secondary">What</dt>
        <dd className="text-text-primary">{entry.summary}</dd>
      </dl>

      {balances.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-2">Account balances</h3>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Account</th>
                <th className="text-right">Before</th>
                <th className="text-right">After</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.account}>
                  <td>{b.account}</td>
                  <td className="num">{fmt.money(b.before)}</td>
                  <td className="num">{fmt.money(b.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode && rows.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-2">
            {mode === 'changed' ? 'Fields changed' : mode === 'created' ? 'Recorded values' : 'Values at removal'}
          </h3>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Field</th>
                {mode !== 'created' && <th>Before</th>}
                {mode !== 'removed' && <th>After</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="text-text-secondary">{r.key}</td>
                  {mode !== 'created' && <td className="font-mono text-xs break-all">{display(r.before)}</td>}
                  {mode !== 'removed' && <td className="font-mono text-xs break-all">{display(r.after)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AuditLog: FC = () => {
  const fmt = useFormatters();
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [viewing, setViewing] = useState<AuditLogEntry | null>(null);

  const { data, loading, error, reload } = useAsyncData(
    () => auditService.getEntries({ page, limit: PAGE_SIZE, entityType: entityType || undefined }),
    { items: [] as AuditLogEntry[], pagination: { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 } },
    [page, entityType],
  );
  const pages = Math.max(1, Math.ceil(data.pagination.total / PAGE_SIZE));

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader withAction={false} />
        <SkeletonTable rows={10} columns={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Every change to money, records and the team: who did it, when, and what it was before"
      />

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Entries can't be edited or deleted, by anyone. {data.pagination.total} recorded.
        </p>
        <Select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="sm:w-52"
          aria-label="Filter by area"
        >
          <option value="">Everything</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<MdHistory className="w-7 h-7" />}
          title="Nothing recorded yet"
          description="Changes appear here as your team records transactions, approves expenses and edits settings."
        />
      ) : (
        <>
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>What happened</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => (
                    <tr key={entry._id}>
                      <td className="text-text-secondary whitespace-nowrap">
                        {fmt.date(entry.createdAt)}
                        <span className="block text-xs">
                          {new Date(entry.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={entry.userId ? 'text-text-primary' : 'text-text-secondary italic'}>
                          {entry.userName}
                        </span>
                      </td>
                      <td>
                        <Badge tone={actionTone(entry.action)}>{actionLabel(entry.action)}</Badge>
                        <span className="block text-xs text-text-secondary mt-1">{entry.entityType}</span>
                      </td>
                      <td className="text-text-primary">{entry.summary}</td>
                      <td>
                        <IconButton label="View details" onClick={() => setViewing(entry)}>
                          <MdOutlineInfo className="w-4 h-4" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} pages={pages} total={data.pagination.total} onChange={setPage} />
        </>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Audit entry" size="lg">
        {viewing && <Details entry={viewing} />}
      </Modal>
    </div>
  );
};

export default AuditLog;
