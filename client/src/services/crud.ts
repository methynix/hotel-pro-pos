import axiosInstance from './api';
import { ApiResponse, ListParams, Paginated, PaginatedResponse } from '../types';

// Shared helpers so every resource service returns plain data instead of
// the raw { success, data, meta } envelope.
export async function getList<T>(url: string, params: object = {}): Promise<T[]> {
  const { data } = await axiosInstance.get<ApiResponse<T[]>>(url, { params });
  return data.data ?? [];
}

export async function getPage<T>(url: string, params: ListParams = {}): Promise<Paginated<T>> {
  const { data } = await axiosInstance.get<PaginatedResponse<T>>(url, { params });
  const items = data.data ?? [];
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  return {
    items,
    pagination: data.meta?.pagination ?? { page, limit, total: items.length, pages: 1 },
  };
}

export async function createOne<T>(url: string, body: object): Promise<T> {
  const { data } = await axiosInstance.post<ApiResponse<T>>(url, body);
  return data.data;
}

export async function updateOne<T>(url: string, body: object): Promise<T> {
  const { data } = await axiosInstance.patch<ApiResponse<T>>(url, body);
  return data.data;
}

export async function deleteOne(url: string): Promise<void> {
  await axiosInstance.delete(url);
}
