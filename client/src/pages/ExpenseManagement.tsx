import { FC, useEffect, useState } from 'react';
import { MdDelete, MdEdit } from 'react-icons/md';
import { expenseService } from '../services/expenseService';
import { Expense } from '../types/index';
import { SafeText } from '../utils/SafeText';

const ExpenseManagement: FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadExpenses();
  }, [page]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const result = await expenseService.getAllExpenses({ page, limit: 20 });
      setExpenses(result.expenses);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseService.deleteExpense(id);
      loadExpenses();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete expense');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-100 text-success-700';
      case 'pending':
        return 'bg-warning-100 text-warning-700';
      case 'rejected':
        return 'bg-danger-100 text-danger-700';
      default:
        return 'bg-secondary-100 text-secondary-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-text-primary mb-2">Expense Management</h1>
        <p className="text-text-secondary">Track and manage all business expenses</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-text-secondary">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">No expenses found</div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Category</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-text-primary">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map(expense => (
                  <tr key={expense._id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {new Date(expense.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      <SafeText>{expense.description}</SafeText>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">{expense.category}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-text-primary text-right">
                      ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(expense.status)}`}>
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-background rounded transition-colors text-accent-600">
                          <MdEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="p-1.5 hover:bg-background rounded transition-colors text-danger-600"
                        >
                          <MdDelete className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
