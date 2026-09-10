import { apiClient } from './client';
import type { SlackStatus } from '../types';

export async function getSlackStatus(): Promise<SlackStatus> {
  const response = await apiClient.get('/api/slack/status');
  return response.data;
}

export async function connectSlack(): Promise<void> {
  // Redirect to backend OAuth URL
  const token = localStorage.getItem('token');
  window.location.href = `http://localhost:5000/api/slack/connect?token=${token}`;
}

export async function disconnectSlack(): Promise<void> {
  await apiClient.delete('/api/slack/disconnect');
}
