import { FC, useState } from 'react';
import { IconType } from 'react-icons';
import {
  MdAccountBalance,
  MdArrowForward,
  MdAssessment,
  MdBarChart,
  MdDelete,
  MdDescription,
  MdHistory,
  MdPrint,
  MdReceiptLong,
  MdSwapVert,
  MdVisibility,
} from 'react-icons/md';
import { reportService } from '../services/reportService';
import { Report } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { useFormatters } from '../hooks/useFormatters';
import { errorMessage } from '../utils/format';
import ReportView, { ReportType } from '../components/reports/ReportView';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Field, Input } from '../components/ui/FormField';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: IconType;
  tone: string;
  usesPeriod: boolean;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'income',
    title: 'Income Statement',
    description: 'Revenue, expenses and net income',
    icon: MdBarChart,
    tone: 'bg-success-50 text-success-600',
    usesPeriod: true,
  },
  {
    id: 'cash_flow',
    title: 'Cash Flow Statement',
    description: 'Completed and pending cash movements',
    icon: MdSwapVert,
    tone: 'bg-info-50 text-info-600',
    usesPeriod: true,
  },
  {
    id: 'balance',
    title: 'Balance Sheet',
    description: 'Assets, liabilities and equity today',
    icon: MdAccountBalance,
    tone: 'bg-accent-50 text-accent-600',
    usesPeriod: false,
  },
  {
    id: 'tax',
    title: 'Tax Summary',
    description: 'Income and expenses by category',
    icon: MdReceiptLong,
    tone: 'bg-warning-50 text-warning-600',
    usesPeriod: true,
  },
  {
    id: 'summary',
    title: 'Comprehensive Report',
    description: 'Every statement in one document',
    icon: MdAssessment,
    tone: 'bg-primary-50 text-primary-700',
    usesPeriod: true,
  },
];

const REPORT_TITLES: Record<string, string> = Object.fromEntries(REPORT_OPTIONS.map((o) => [o.id, o.title]));

const toInputDate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

const PRESETS: { label: string; range: () => [Date, Date] }[] = [
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    },
  },
  {
    label: 'Last month',
    range: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)];
    },
  },
  {
    label: 'This quarter',
    range: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), now];
    },
  },
  {
    label: 'Year to date',
    range: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), 0, 1), now];
    },
  },
];

interface ShownReport {
  type: ReportType;
  data: Record<string, unknown>;
  startDate?: string;
  endDate?: string;
  generatedAt: string;
}

const ReportsManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();
  const fmt = useFormatters();

  const [tab, setTab] = useState<'generate' | 'history'>('generate');
  const [range, setRange] = useState(() => {
    const [start, end] = PRESETS[0].range();
    return { startDate: toInputDate(start), endDate: toInputDate(end) };
  });
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [current, setCurrent] = useState<ShownReport | null>(null);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [toDelete, setToDelete] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);

  const history = useAsyncData(() => reportService.getAllReports(), [] as Report[]);

  const rangeInvalid = !range.startDate || !range.endDate || range.startDate > range.endDate;

  const generate = async (option: ReportOption) => {
    if (option.usesPeriod && rangeInvalid) {
      toast.error('Choose a valid period: the start date must be on or before the end date.');
      return;
    }
    setGenerating(option.id);
    try {
      const { startDate, endDate } = range;
      const data = await {
        income: () => reportService.generateIncomeStatement(startDate, endDate),
        cash_flow: () => reportService.generateCashFlowStatement(startDate, endDate),
        balance: () => reportService.generateBalanceSheet(),
        tax: () => reportService.generateTaxSummary(startDate, endDate),
        summary: () => reportService.generateComprehensiveReport(startDate, endDate),
        expense: () => Promise.resolve({}),
      }[option.id]();

      setCurrent({
        type: option.id,
        data,
        startDate: option.usesPeriod ? startDate : undefined,
        endDate: option.usesPeriod ? endDate : undefined,
        generatedAt: new Date().toISOString(),
      });
      history.reload();
      toast.success(`${option.title} generated`);
      window.setTimeout(() => document.getElementById('printable-report')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to generate report'));
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await reportService.deleteReport(toDelete._id);
      history.setData((list) => list.filter((r) => r._id !== toDelete._id));
      toast.success('Report deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete report'));
    } finally {
      setDeleting(false);
    }
  };

  const periodLabel = (start?: string, end?: string) =>
    start && end ? `${fmt.date(start)} to ${fmt.date(end)}` : 'As of generation date';

  const renderDocument = (report: ShownReport) => (
    <div id="printable-report" className="bg-surface rounded-xl border border-border shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-6 border-b border-border">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">ledgerHQ</p>
          <h2 className="text-2xl font-bold text-text-primary mt-1">{REPORT_TITLES[report.type] || 'Report'}</h2>
          <p className="text-sm text-text-secondary mt-1">
            {periodLabel(report.startDate, report.endDate)} · Generated {fmt.date(report.generatedAt)}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<MdPrint className="w-5 h-5" />}
          onClick={() => window.print()}
          className="print:hidden"
        >
          Print / Save PDF
        </Button>
      </div>
      <div className="p-6">
        <ReportView type={report.type} data={report.data} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" description="Generate statements, review history and export to PDF" />

      <div className="flex gap-1 border-b border-border" role="tablist">
        {(
          [
            { id: 'generate', label: 'Generate', icon: MdDescription },
            { id: 'history', label: 'History', icon: MdHistory },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-accent-600 text-accent-600'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'history' && history.data.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-background text-xs text-text-secondary">
                {history.data.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'generate' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <Field label="Start date" htmlFor="report-start">
                  <Input
                    id="report-start"
                    type="date"
                    value={range.startDate}
                    max={range.endDate}
                    onChange={(e) => setRange({ ...range, startDate: e.target.value })}
                  />
                </Field>
                <Field label="End date" htmlFor="report-end">
                  <Input
                    id="report-end"
                    type="date"
                    value={range.endDate}
                    min={range.startDate}
                    onChange={(e) => setRange({ ...range, endDate: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => {
                  const [s, e] = preset.range();
                  const active = range.startDate === toInputDate(s) && range.endDate === toInputDate(e);
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setRange({ startDate: toInputDate(s), endDate: toInputDate(e) })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        active
                          ? 'bg-accent-50 border-accent-300 text-accent-700'
                          : 'border-border text-text-secondary hover:bg-background'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {rangeInvalid && <p className="mt-3 text-xs text-danger-600">The start date must be on or before the end date.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const busy = generating === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => generate(option)}
                  disabled={!!generating}
                  className="group bg-surface border border-border rounded-xl p-6 text-left hover:shadow-md hover:border-accent-300 transition-all disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${option.tone}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-text-primary">{option.title}</h3>
                  <p className="text-sm text-text-secondary mt-1">{option.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-accent-600 text-sm font-medium">
                    {busy ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Generating
                      </>
                    ) : (
                      <>
                        Generate
                        <MdArrowForward className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {generating ? (
            <div className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-6" role="status" aria-label="Generating report">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-40" />
            </div>
          ) : current ? (
            renderDocument(current)
          ) : (
            <EmptyState
              icon={<MdDescription className="w-7 h-7" />}
              title="No report generated yet"
              description="Pick a period and choose a report above. Generated reports are also saved to History."
            />
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {history.error && <ErrorBanner message={history.error} onRetry={history.reload} />}
          {history.loading ? (
            <SkeletonTable rows={5} columns={4} />
          ) : history.data.length === 0 ? (
            <EmptyState
              icon={<MdHistory className="w-7 h-7" />}
              title="No saved reports"
              description="Every report you generate is saved here so you can revisit or print it later."
              action={
                <Button variant="secondary" onClick={() => setTab('generate')}>
                  Generate a report
                </Button>
              }
            />
          ) : (
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Report</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Generated</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.data.map((report) => {
                      const option = REPORT_OPTIONS.find((o) => o.id === report.type);
                      const Icon = option?.icon || MdDescription;
                      return (
                        <tr key={report._id} className="hover:bg-background/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${option?.tone || 'bg-background'}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-medium text-text-primary">
                                {REPORT_TITLES[report.type] || report.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                            {option?.usesPeriod ? periodLabel(report.startDate, report.endDate) : <Badge>Point in time</Badge>}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{fmt.date(report.createdAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1">
                              <IconButton label="View report" tone="accent" onClick={() => setViewing(report)}>
                                <MdVisibility className="w-4 h-4" />
                              </IconButton>
                              {perms.canDelete && (
                                <IconButton label="Delete report" tone="danger" onClick={() => setToDelete(report)}>
                                  <MdDelete className="w-4 h-4" />
                                </IconButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? REPORT_TITLES[viewing.type] || viewing.title : ''}
        size="lg"
      >
        {viewing &&
          renderDocument({
            type: viewing.type,
            data: viewing.data,
            startDate: REPORT_OPTIONS.find((o) => o.id === viewing.type)?.usesPeriod ? viewing.startDate : undefined,
            endDate: REPORT_OPTIONS.find((o) => o.id === viewing.type)?.usesPeriod ? viewing.endDate : undefined,
            generatedAt: viewing.createdAt,
          })}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete report"
        message="Remove this saved report from history? You can always generate it again."
        confirmLabel="Delete Report"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default ReportsManagement;
