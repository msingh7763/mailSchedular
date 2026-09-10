import { apiClient } from './client';
import type { ComposeEmailData, PaginatedEmails, SearchResult } from '../types';

export async function scheduleEmail(data: ComposeEmailData) {
  const response = await apiClient.post('/api/emails/schedule', {
    ...data,
    startTime: new Date(data.startTime).toISOString(),
  });
  return response.data;
}

export async function getEmails(status: 'scheduled' | 'sent', page = 1): Promise<PaginatedEmails> {
  const response = await apiClient.get('/api/emails', {
    params: { status, page, limit: 20 },
  });
  return response.data;
}

export async function searchEmails(q: string): Promise<{ results: SearchResult[]; total: any }> {
  const response = await apiClient.get('/api/emails/search', { params: { q } });
  return response.data;
}

export async function getEmail(id: string) {
  const response = await apiClient.get(`/api/emails/${id}`);
  return response.data;
}
