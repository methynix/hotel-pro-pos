import { Report } from '../models/Report';
import { Transaction, ITransaction } from '../models/Transaction';
import { Account } from '../models/Account';
import { Category } from '../models/Category';
import { fromMinor } from '../utils/money';

const REPORT_TITLES: Record<string, string> = {
  income: 'Income Statement',
  cash_flow: 'Cash Flow Statement',
  balance: 'Balance Sheet',
  tax: 'Tax Summary',
  summary: 'Comprehensive Report',
};

// Make the end date inclusive of the whole day the user picked.
const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

// Income and expense transactions dated within the period. Transfers move
// money between the organization's own accounts, so they never count as
// income or expense. Amounts are summed in minor units, reported in major.
const periodTransactions = (organizationId: string, startDate: Date, endDate: Date, status?: string) =>
  Transaction.find({
    organizationId,
    type: { $in: ['income', 'expense'] },
    transactionDate: { $gte: startDate, $lte: endOfDay(endDate) },
    ...(status ? { status } : {}),
  });

const sum = (txs: ITransaction[], type: 'income' | 'expense') =>
  txs.filter((t) => t.type === type).reduce((total, t) => total + t.amount, 0);

export const reportService = {
  async generateIncomeStatement(organizationId: string, startDate: Date, endDate: Date): Promise<any> {
    const transactions = await periodTransactions(organizationId, startDate, endDate, 'completed');
    const revenues = sum(transactions, 'income');
    const expenses = sum(transactions, 'expense');
    const netIncome = revenues - expenses;

    return {
      revenues: fromMinor(revenues),
      expenses: fromMinor(expenses),
      netIncome: fromMinor(netIncome),
      margin: revenues > 0 ? Number(((netIncome / revenues) * 100).toFixed(2)) : 0,
      transactionCount: transactions.length,
    };
  },

  async generateCashFlowStatement(organizationId: string, startDate: Date, endDate: Date): Promise<any> {
    const transactions = await periodTransactions(organizationId, startDate, endDate);
    const net = (status: string) => {
      const txs = transactions.filter((t) => t.status === status);
      return sum(txs, 'income') - sum(txs, 'expense');
    };
    const operatingCashFlow = net('completed');
    const pendingCashFlow = net('pending');

    return {
      operatingCashFlow: fromMinor(operatingCashFlow),
      pendingCashFlow: fromMinor(pendingCashFlow),
      totalCashFlow: fromMinor(operatingCashFlow + pendingCashFlow),
      transactionCount: transactions.length,
    };
  },

  async generateBalanceSheet(organizationId: string): Promise<any> {
    const accounts = await Account.find({ organizationId, status: 'active' });
    const assets = accounts.filter((a) => a.type !== 'credit').reduce((total, a) => total + a.currentBalance, 0);
    const liabilities = accounts.filter((a) => a.type === 'credit').reduce((total, a) => total + a.currentBalance, 0);

    return {
      assets: fromMinor(assets),
      liabilities: fromMinor(liabilities),
      equity: fromMinor(assets - liabilities),
      accountCount: accounts.length,
    };
  },

  async generateTaxSummary(organizationId: string, startDate: Date, endDate: Date): Promise<any> {
    const transactions = await periodTransactions(organizationId, startDate, endDate, 'completed');
    const categories = await Category.find({ organizationId }).select('name');
    const names = new Map(categories.map((c) => [c._id.toString(), c.name]));

    const byCategory = (type: 'income' | 'expense') => {
      const totals: Record<string, number> = {};
      transactions
        .filter((t) => t.type === type)
        .forEach((t) => {
          const name = names.get(t.categoryId?.toString() ?? '') ?? 'Uncategorized';
          totals[name] = (totals[name] || 0) + t.amount;
        });
      return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, fromMinor(v)]));
    };

    return {
      expensesByCategory: byCategory('expense'),
      incomeByCategory: byCategory('income'),
      totalExpenses: fromMinor(sum(transactions, 'expense')),
      totalIncome: fromMinor(sum(transactions, 'income')),
    };
  },

  async generateComprehensiveReport(organizationId: string, startDate: Date, endDate: Date): Promise<any> {
    const [incomeStatement, cashFlow, taxSummary] = await Promise.all([
      this.generateIncomeStatement(organizationId, startDate, endDate),
      this.generateCashFlowStatement(organizationId, startDate, endDate),
      this.generateTaxSummary(organizationId, startDate, endDate),
    ]);

    const balanceSheet = await this.generateBalanceSheet(organizationId);

    return {
      reportPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      incomeStatement,
      cashFlow,
      taxSummary,
      balanceSheet,
      generatedAt: new Date().toISOString(),
    };
  },

  async saveReport(
    organizationId: string,
    createdBy: string,
    reportType: string,
    data: any,
    period?: { startDate: Date; endDate: Date }
  ): Promise<any> {
    return Report.create({
      organizationId,
      createdBy,
      type: reportType,
      title: REPORT_TITLES[reportType] || 'Report',
      startDate: period?.startDate || new Date(),
      endDate: period?.endDate || new Date(),
      data,
    });
  },

  async getReportsByUser(organizationId: string, limit = 20, skip = 0): Promise<any[]> {
    return Report.find({ organizationId }).limit(limit).skip(skip).sort({ createdAt: -1 });
  },

  async getReportById(id: string, organizationId: string): Promise<any> {
    return Report.findOne({ _id: id, organizationId });
  },

  async deleteReport(id: string, organizationId: string): Promise<boolean> {
    const result = await Report.deleteOne({ _id: id, organizationId });
    return result.deletedCount > 0;
  },
};
