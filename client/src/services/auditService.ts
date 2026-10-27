import { AuditLogEntry, Paginated } from '../types';
import { getPage } from './crud';

export interface AuditFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  userId?: string;
}

export const auditService = {
  getEntries: (filters: AuditFilters = {}): Promise<Paginated<AuditLogEntry>> => getPage<AuditLogEntry>('/audit-logs', filters),
};
