import { Report } from '../models/Report';
import { Transaction } from '../models/Transaction';
import { Expense } from '../models/Expense';
import { Account } from '../models/Account';

export const reportService = {
  async generateIncomeStatement(userId: string, startDate: Date, endDate: Date): Promise<any> {
    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const inflows = transactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
    const outflows = transactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
    const netIncome = inflows - outflows;

    const data = {
      revenues: inflows,
      expenses: outflows,
      netIncome,
      margin: inflows > 0 ? ((netIncome / inflows) * 100).toFixed(2) : 0,
    };

    return data;
  },

  async generateCashFlowStatement(userId: string, startDate: Date, endDate: Date): Promise<any> {
    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const operatingCashFlow = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.type === 'inflow' ? t.amount : -t.amount), 0);

    const pendingCashFlow = transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + (t.type === 'inflow' ? t.amount : -t.amount), 0);

    return {
      operatingCashFlow,
      pendingCashFlow,
      totalCashFlow: operatingCashFlow + pendingCashFlow,
      transactionCount: transactions.length,
    };
  },

  async generateBalanceSheet(userId: string): Promise<any> {
    const accounts = await Account.find({ userId });

    const assets = accounts.filter(a => a.type === 'checking' || a.type === 'savings').reduce((sum, a) => sum + a.balance, 0);

    const liabilities = accounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const equity = assets - liabilities;

    return {
      assets,
      liabilities,
      equity,
      accountCount: accounts.length,
    };
  },

  async generateTaxSummary(userId: string, startDate: Date, endDate: Date): Promise<any> {
    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const expensesByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.type === 'outflow') {
        expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
      } else {
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
      }
    });

    return {
      expensesByCategory,
      incomeByCategory,
      totalExpenses: Object.values(expensesByCategory).reduce((a, b) => a + b, 0),
      totalIncome: Object.values(incomeByCategory).reduce((a, b) => a + b, 0),
    };
  },

  async generateComprehensiveReport(userId: string, startDate: Date, endDate: Date): Promise<any> {
    const [incomeStatement, cashFlow, taxSummary] = await Promise.all([
      this.generateIncomeStatement(userId, startDate, endDate),
      this.generateCashFlowStatement(userId, startDate, endDate),
      this.generateTaxSummary(userId, startDate, endDate),
    ]);

    const balanceSheet = await this.generateBalanceSheet(userId);

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

  async saveReport(userId: string, reportType: string, data: any): Promise<any> {
    return Report.create({
      userId,
      type: reportType,
      title: `${reportType} Report - ${new Date().toLocaleDateString()}`,
      startDate: data.reportPeriod?.startDate || new Date(),
      endDate: data.reportPeriod?.endDate || new Date(),
      data,
    });
  },

  async getReportsByUser(userId: string, limit = 20, skip = 0): Promise<any[]> {
    return Report.find({ userId }).limit(limit).skip(skip).sort({ createdAt: -1 });
  },

  async getReportById(id: string, userId: string): Promise<any> {
    return Report.findOne({ _id: id, userId });
  },

  async deleteReport(id: string, userId: string): Promise<boolean> {
    const result = await Report.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  },
};
