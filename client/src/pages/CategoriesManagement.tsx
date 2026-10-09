import { FC, FormEvent, useMemo, useState } from 'react';
import { MdAdd, MdArrowDownward, MdArrowUpward, MdCategory, MdCheck, MdDelete, MdEdit } from 'react-icons/md';
import { categoryService } from '../services/categoryService';
import { Category } from '../types';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import { errorMessage } from '../utils/format';
import { CATEGORY_COLORS, CATEGORY_ICONS, getCategoryIcon } from '../utils/categoryIcons';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import SearchInput from '../components/ui/SearchInput';
import ReadOnlyNotice from '../components/ui/ReadOnlyNotice';
import { Field, Input, Textarea } from '../components/ui/FormField';
import { SkeletonCards, SkeletonHeader, Skeleton } from '../components/ui/Skeleton';

type CategoryType = Category['type'];

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'expense' as CategoryType,
  icon: 'category',
  color: CATEGORY_COLORS[0],
};

const TABS: { id: '' | CategoryType; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
];

const CategoriesManagement: FC = () => {
  const perms = usePermissions();
  const toast = useToast();

  const { data: categories, setData: setCategories, loading, error, reload } = useAsyncData(
    () => categoryService.getAllCategories(),
    [] as Category[]
  );

  const [tab, setTab] = useState<'' | CategoryType>('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const counts = useMemo(
    () => ({
      '': categories.length,
      expense: categories.filter((c) => c.type === 'expense').length,
      income: categories.filter((c) => c.type === 'income').length,
    }),
    [categories]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .filter((c) => (!tab || c.type === tab) && (!term || c.name.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, tab, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, type: tab || 'expense' });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || '',
      type: c.type,
      icon: c.icon && CATEGORY_ICONS[c.icon] ? c.icon : 'category',
      color: c.color || CATEGORY_COLORS[0],
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError('Category name is required');
      return;
    }
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === form.type && c._id !== editing?._id
    );
    if (duplicate) {
      setFormError(`An ${form.type} category named "${duplicate.name}" already exists`);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, name, description: form.description.trim() };
      if (editing) {
        const updated = await categoryService.updateCategory(editing._id, payload);
        setCategories((list) => list.map((c) => (c._id === updated._id ? updated : c)));
        toast.success('Category updated');
      } else {
        const created = await categoryService.createCategory(payload);
        setCategories((list) => [...list, created]);
        toast.success('Category created');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save category'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await categoryService.deleteCategory(toDelete._id);
      setCategories((list) => list.filter((c) => c._id !== toDelete._id));
      toast.success('Category deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete category'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader withAction={perms.canCreate} />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <SkeletonCards count={6} />
      </div>
    );
  }

  const FormIcon = getCategoryIcon(form.icon);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize income and expenses so reports and budgets stay meaningful"
        actions={
          perms.canCreate && (
            <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
              New Category
            </Button>
          )
        }
      />

      {perms.isReadOnly && <ReadOnlyNotice />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="inline-flex p-1 bg-surface border border-border rounded-lg" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-accent-600 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
              <span className={`ml-2 text-xs ${tab === t.id ? 'text-accent-100' : 'text-text-secondary'}`}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories" className="flex-1" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MdCategory className="w-7 h-7" />}
          title={categories.length === 0 ? 'No categories yet' : 'No categories match'}
          description={
            categories.length === 0
              ? 'Create categories like Payroll, Rent or Sales to group your transactions.'
              : 'Try another search term or switch tabs.'
          }
          action={
            perms.canCreate &&
            categories.length === 0 && (
              <Button icon={<MdAdd className="w-5 h-5" />} onClick={openCreate}>
                New Category
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            const color = c.color || CATEGORY_COLORS[0];
            return (
              <div
                key={c._id}
                className="group bg-surface rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}1A`, color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{c.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 text-xs font-medium ${
                        c.type === 'income' ? 'text-success-600' : 'text-danger-600'
                      }`}
                    >
                      {c.type === 'income' ? (
                        <MdArrowUpward className="w-3.5 h-3.5" />
                      ) : (
                        <MdArrowDownward className="w-3.5 h-3.5" />
                      )}
                      {c.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </div>
                  {(perms.canUpdate || perms.canDelete) && (
                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                      {perms.canUpdate && (
                        <IconButton label="Edit category" tone="accent" onClick={() => openEdit(c)}>
                          <MdEdit className="w-4 h-4" />
                        </IconButton>
                      )}
                      {perms.canDelete && (
                        <IconButton label="Delete category" tone="danger" onClick={() => setToDelete(c)}>
                          <MdDelete className="w-4 h-4" />
                        </IconButton>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-4 text-sm text-text-secondary line-clamp-2 min-h-[2.5rem]">
                  {c.description || 'No description'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        dismissible={!saving}
        title={editing ? 'Edit Category' : 'New Category'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" loading={saving}>
              {editing ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-5">
          {formError && <ErrorBanner message={formError} />}

          <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${form.color}1A`, color: form.color }}
            >
              <FormIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">{form.name || 'Category name'}</p>
              <p className="text-xs text-text-secondary capitalize">{form.type}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" htmlFor="cat-name" required>
              <Input
                id="cat-name"
                value={form.name}
                maxLength={50}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Type" htmlFor="cat-type-expense">
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((type) => (
                  <button
                    key={type}
                    id={`cat-type-${type}`}
                    type="button"
                    onClick={() => setForm({ ...form, type })}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.type === type
                        ? type === 'income'
                          ? 'border-success-500 bg-success-50 text-success-700'
                          : 'border-danger-500 bg-danger-50 text-danger-700'
                        : 'border-border text-text-secondary hover:bg-background'
                    }`}
                  >
                    {type === 'income' ? <MdArrowUpward className="w-4 h-4" /> : <MdArrowDownward className="w-4 h-4" />}
                    {type === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Description" htmlFor="cat-description">
            <Textarea
              id="cat-description"
              rows={2}
              maxLength={200}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div>
            <p className="block text-sm font-medium text-text-primary mb-2">Icon</p>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
              {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  title={key}
                  aria-label={`Icon ${key}`}
                  aria-pressed={form.icon === key}
                  onClick={() => setForm({ ...form, icon: key })}
                  className={`aspect-square rounded-lg flex items-center justify-center border transition-colors ${
                    form.icon === key
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-border text-text-secondary hover:bg-background'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-text-primary mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  aria-pressed={form.color === color}
                  onClick={() => setForm({ ...form, color })}
                  className="w-8 h-8 rounded-full flex items-center justify-center ring-offset-2 transition-shadow"
                  style={{
                    backgroundColor: color,
                    boxShadow: form.color === color ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : undefined,
                  }}
                >
                  {form.color === color && <MdCheck className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete category"
        message={
          <>
            Delete <strong className="text-text-primary">{toDelete?.name}</strong>? Existing transactions keep their
            category label, but budgets linked to it will no longer match.
          </>
        }
        confirmLabel="Delete Category"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default CategoriesManagement;
