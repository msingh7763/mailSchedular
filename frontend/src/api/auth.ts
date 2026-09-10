import { apiClient } from './client';
import type { User } from '../types';

export async function loginWithGoogle(credential: string): Promise<{ token: string; user: User }> {
  const response = await apiClient.post('/api/auth/google', { credential });
  return response.data;
}

export async function loginWithEmail(email: string, password: string): Promise<{ token: string; user: User }> {
  const response = await apiClient.post('/api/auth/login', { email, password });
  return response.data;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const response = await apiClient.post('/api/auth/register', { name, email, password });
  return response.data;
}

export async function getCurrentUser(): Promise<{ user: User }> {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
}
