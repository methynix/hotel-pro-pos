import { FC, useEffect, useState } from 'react';
import { MdEdit, MdDelete, MdAdd, MdWarning } from 'react-icons/md';
import { budgetService } from '../services/budgetService';
import { categoryService } from '../services/categoryService';
import { Budget, Category } from '../types/index';

const BudgetManagement: FC = () => {
  const [budgets, setBudgets] = useState<(Budget & { percentageUsed: number; isAlertTriggered: boolean })[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    alertThreshold: 80,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [budgetsData, alertsData, categoriesData] = await Promise.all([
        budgetService.getAllBudgets(),
        budgetService.getAlerts(),
        categoryService.getAllCategories(),
      ]);
      setBudgets(budgetsData);
      setAlerts(alertsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await budgetService.updateBudget(editingId, formData as any);
      } else {
        await budgetService.createBudget(formData as any);
      }
      setFormData({ categoryId: '', amount: '', period: 'monthly', alertThreshold: 80 });
      setEditingId(null);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Failed to save budget:', error);
      alert('Failed to save budget');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgetService.deleteBudget(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget');
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c._id === categoryId)?.name || 'Unknown';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-danger-500';
    if (percentage >= 80) return 'bg-warning-500';
    return 'bg-success-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Budget Management</h1>
          <p className="text-text-secondary">Set and track spending budgets by category</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ categoryId: '', amount: '', period: 'monthly', alertThreshold: 80 });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
        >
          <MdAdd className="w-5 h-5" />
          New Budget
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-warning-50 border-l-4 border-warning-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <MdWarning className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning-900 mb-2">Budget Alerts</h3>
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <p key={i} className={`text-sm ${alert.severity === 'critical' ? 'text-danger-700' : 'text-warning-700'}`}>
                    <strong>{alert.category}:</strong> {alert.message} ({alert.percentageUsed.toFixed(1)}%)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">{editingId ? 'Edit Budget' : 'Create New Budget'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={formData.categoryId}
              onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Budget Amount"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              required
            />

            <select
              value={formData.period}
              onChange={e => setFormData({ ...formData, period: e.target.value as any })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>

            <input
              type="number"
              placeholder="Alert Threshold %"
              value={formData.alertThreshold}
              onChange={e => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
              min="0"
              max="100"
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            />

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg font-medium transition-colors"
              >
                Save Budget
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ categoryId: '', amount: '', period: 'monthly', alertThreshold: 80 });
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budgets List */}
      {loading ? (
        <div className="text-center py-8 text-text-secondary">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">No budgets yet. Create one to get started!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map(budget => (
            <div key={budget._id} className="bg-surface rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{getCategoryName(budget.categoryId)}</h3>
                  <p className="text-sm text-text-secondary capitalize">{budget.period}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(budget._id);
                      setFormData({
                        categoryId: budget.categoryId,
                        amount: budget.amount.toString(),
                        period: budget.period,
                        alertThreshold: budget.alertThreshold,
                      });
                      setShowForm(true);
                    }}
                    className="p-1.5 hover:bg-background rounded transition-colors text-accent-600"
                  >
                    <MdEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(budget._id)}
                    className="p-1.5 hover:bg-background rounded transition-colors text-danger-600"
                  >
                    <MdDelete className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">
                      ${budget.currentSpending.toLocaleString('en-US', { maximumFractionDigits: 2 })} / ${budget.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-sm font-bold ${budget.isAlertTriggered ? 'text-danger-600' : 'text-success-600'}`}>
                      {budget.percentageUsed.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(budget.percentageUsed)}`}
                      style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-text-secondary">
                    Remaining: ${Math.max(0, budget.amount - budget.currentSpending).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                  {budget.isAlertTriggered && (
                    <p className="text-xs text-warning-600 font-semibold mt-1">⚠️ Budget alert triggered</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetManagement;
