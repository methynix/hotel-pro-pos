import { FC, useState } from 'react';
import { MdDownload, MdDelete, MdGeneratingTokens } from 'react-icons/md';
import { reportService } from '../services/reportService';

const ReportsManagement: FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [reports, setReports] = useState<any[]>([]);
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);

  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const handleGenerateReport = async (type: 'income' | 'cashflow' | 'balance' | 'tax' | 'comprehensive') => {
    try {
      setLoading(true);
      let report;

      switch (type) {
        case 'income':
          report = await reportService.generateIncomeStatement(dateRange.startDate, dateRange.endDate);
          break;
        case 'cashflow':
          report = await reportService.generateCashFlowStatement(dateRange.startDate, dateRange.endDate);
          break;
        case 'balance':
          report = await reportService.generateBalanceSheet();
          break;
        case 'tax':
          report = await reportService.generateTaxSummary(dateRange.startDate, dateRange.endDate);
          break;
        case 'comprehensive':
          report = await reportService.generateComprehensiveReport(dateRange.startDate, dateRange.endDate);
          break;
      }

      setGeneratedReport({ type, data: report });
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (generatedReport) {
      reportService.generatePDF(generatedReport.data, `${generatedReport.type}-report`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-text-primary mb-2">Financial Reports</h1>
        <p className="text-text-secondary">Generate comprehensive financial statements</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'generate'
              ? 'border-accent-600 text-accent-600'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Generate Report
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-accent-600 text-accent-600'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Report History
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {/* Date Range */}
          <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Report Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
                />
              </div>
            </div>
          </div>

          {/* Report Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: 'income',
                title: 'Income Statement',
                description: 'Revenues, expenses, and net income',
                icon: '📊',
              },
              {
                id: 'cashflow',
                title: 'Cash Flow Statement',
                description: 'Operating and pending cash flows',
                icon: '💰',
              },
              {
                id: 'balance',
                title: 'Balance Sheet',
                description: 'Assets, liabilities, and equity',
                icon: '⚖️',
              },
              {
                id: 'tax',
                title: 'Tax Summary',
                description: 'Categorized income and expenses',
                icon: '📋',
              },
              {
                id: 'comprehensive',
                title: 'Comprehensive Report',
                description: 'All reports combined',
                icon: '📈',
              },
            ].map(report => (
              <button
                key={report.id}
                onClick={() => handleGenerateReport(report.id as any)}
                disabled={loading}
                className="bg-surface border border-border rounded-xl p-6 text-left hover:shadow-md transition-shadow disabled:opacity-50"
              >
                <div className="text-3xl mb-3">{report.icon}</div>
                <h3 className="font-semibold text-text-primary mb-1">{report.title}</h3>
                <p className="text-sm text-text-secondary">{report.description}</p>
                <div className="mt-4 flex items-center gap-2 text-accent-600 text-sm font-medium">
                  <MdGeneratingTokens className="w-4 h-4" />
                  Generate
                </div>
              </button>
            ))}
          </div>

          {/* Generated Report Display */}
          {generatedReport && (
            <div className="bg-surface rounded-xl border border-border shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">
                  {generatedReport.type.charAt(0).toUpperCase() + generatedReport.type.slice(1)} Report
                </h2>
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
                >
                  <MdDownload className="w-5 h-5" />
                  Print / Export
                </button>
              </div>

              <div className="bg-background rounded-lg p-6 overflow-auto max-h-96">
                <pre className="text-sm text-text-primary font-mono">
                  {JSON.stringify(generatedReport.data, null, 2)}
                </pre>
              </div>

              {generatedReport.type === 'income' && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-success-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-success-700">
                      ${generatedReport.data.revenues?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                  <div className="bg-danger-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-danger-700">
                      ${generatedReport.data.expenses?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                  <div className="bg-accent-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Net Income</p>
                    <p className="text-2xl font-bold text-accent-700">
                      ${generatedReport.data.netIncome?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                </div>
              )}

              {generatedReport.type === 'cashflow' && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-info-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Operating Cash Flow</p>
                    <p className="text-2xl font-bold text-info-700">
                      ${generatedReport.data.operatingCashFlow?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                  <div className="bg-warning-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Pending Cash Flow</p>
                    <p className="text-2xl font-bold text-warning-700">
                      ${generatedReport.data.pendingCashFlow?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                  <div className="bg-success-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Total Cash Flow</p>
                    <p className="text-2xl font-bold text-success-700">
                      ${generatedReport.data.totalCashFlow?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                </div>
              )}

              {generatedReport.type === 'balance' && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-success-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Total Assets</p>
                    <p className="text-2xl font-bold text-success-700">
                      ${generatedReport.data.assets?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                  <div className="bg-danger-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Total Liabilities</p>
                    <p className="text-2xl font-bold text-danger-700">
                      ${generatedReport.data.liabilities?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                  <div className="bg-accent-50 p-4 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Equity</p>
                    <p className="text-2xl font-bold text-accent-700">
                      ${generatedReport.data.equity?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="text-center py-8 text-text-secondary">
          <MdDelete className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Report history feature coming soon</p>
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;
