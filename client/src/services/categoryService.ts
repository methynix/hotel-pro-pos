import { Category } from '../types';
import { getList, createOne, updateOne, deleteOne } from './crud';

const BASE = '/categories';

export const categoryService = {
  getAllCategories: () => getList<Category>(BASE),
  createCategory: (data: Partial<Category>) => createOne<Category>(BASE, data),
  updateCategory: (id: string, data: Partial<Category>) => updateOne<Category>(`${BASE}/${id}`, data),
  deleteCategory: (id: string) => deleteOne(`${BASE}/${id}`),
};
