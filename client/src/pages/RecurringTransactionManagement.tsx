import { FC, useEffect, useState } from 'react';
import { MdEdit, MdDelete, MdAdd, MdToggleOn, MdToggleOff } from 'react-icons/md';
import { recurringTransactionService } from '../services/recurringTransactionService';
import { categoryService } from '../services/categoryService';
import { RecurringTransaction, Category } from '../types/index';
import { SafeText } from '../utils/SafeText';

const RecurringTransactionManagement: FC = () => {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'outflow' as 'inflow' | 'outflow',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    nextDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recurringData, categoriesData] = await Promise.all([
        recurringTransactionService.getAllRecurring(),
        categoryService.getAllCategories(),
      ]);
      setRecurring(recurringData);
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
        await recurringTransactionService.updateRecurring(editingId, formData as any);
      } else {
        await recurringTransactionService.createRecurring(formData as any);
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save recurring transaction');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await recurringTransactionService.toggleRecurring(id);
      loadData();
    } catch (error) {
      console.error('Failed to toggle:', error);
      alert('Failed to toggle recurring transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recurring transaction?')) return;
    try {
      await recurringTransactionService.deleteRecurring(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      category: '',
      type: 'outflow',
      frequency: 'monthly',
      nextDate: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c._id === categoryId)?.name || 'Unknown';
  };

  const getFrequencyLabel = (freq: string) => freq.charAt(0).toUpperCase() + freq.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">Recurring Transactions</h1>
          <p className="text-text-secondary">Automate regular income and expenses</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
        >
          <MdAdd className="w-5 h-5" />
          Add Recurring
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">
            {editingId ? 'Edit Recurring Transaction' : 'Create New Recurring Transaction'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Amount"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              required
            />

            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              required
            />

            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
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

            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="inflow">Inflow</option>
              <option value="outflow">Outflow</option>
            </select>

            <select
              value={formData.frequency}
              onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>

            <input
              type="date"
              value={formData.nextDate}
              onChange={e => setFormData({ ...formData, nextDate: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              required
            />

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg font-medium transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-text-secondary">Loading...</div>
      ) : recurring.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">No recurring transactions. Create one to get started!</div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Category</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-text-primary">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Frequency</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Next Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recurring.map(tx => (
                  <tr key={tx._id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-sm text-text-primary">
                      <SafeText>{tx.description}</SafeText>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">{getCategoryName(tx.category)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-text-primary text-right">
                      ${tx.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.type === 'inflow' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                      }`}>
                        {tx.type === 'inflow' ? '↑ Inflow' : '↓ Outflow'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">{getFrequencyLabel(tx.frequency)}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {new Date(tx.nextDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.isActive ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-700'
                      }`}>
                        {tx.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(tx._id)}
                          className="p-1.5 hover:bg-background rounded transition-colors text-accent-600"
                          title={tx.isActive ? 'Pause' : 'Resume'}
                        >
                          {tx.isActive ? <MdToggleOn className="w-5 h-5" /> : <MdToggleOff className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(tx._id);
                            setFormData({
                              amount: tx.amount.toString(),
                              description: tx.description,
                              category: tx.category,
                              type: tx.type,
                              frequency: tx.frequency,
                              nextDate: new Date(tx.nextDate).toISOString().split('T')[0],
                            });
                            setShowForm(true);
                          }}
                          className="p-1.5 hover:bg-background rounded transition-colors text-accent-600"
                        >
                          <MdEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx._id)}
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

export default RecurringTransactionManagement;
