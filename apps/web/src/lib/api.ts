import { Capacitor } from '@capacitor/core';
import {
  localRegister,
  localLogin,
  localUpdateProfile,
  localChangePassword,
  localDeleteAccount,
  getLocalUserFromToken,
} from './local-auth';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

function useLocalAuth(): boolean {
  if (API_BASE) return false;
  return Capacitor.isNativePlatform();
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Ein Fehler ist aufgetreten');
  }
  return data;
}

function getUserIdFromToken(): string | null {
  const token = localStorage.getItem('token');
  if (!token?.startsWith('local-')) return null;
  return token.slice(6);
}

export async function register(email: string, password: string, name: string) {
  if (useLocalAuth()) {
    return localRegister(email, password, name);
  }
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  }) as Promise<{ token: string; user: User }>;
}

export async function login(email: string, password: string) {
  if (useLocalAuth()) {
    return localLogin(email, password);
  }
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }) as Promise<{ token: string; user: User }>;
}

export async function getMe() {
  if (useLocalAuth()) {
    const user = getLocalUserFromToken(localStorage.getItem('token'));
    if (!user) throw new Error('Nicht autorisiert');
    return { user };
  }
  return apiFetch('/auth/me') as Promise<{ user: User }>;
}

export async function updateProfile(name: string) {
  if (useLocalAuth()) {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error('Nicht autorisiert');
    return localUpdateProfile(userId, name);
  }
  return apiFetch('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  }) as Promise<{ user: User }>;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  if (useLocalAuth()) {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error('Nicht autorisiert');
    return localChangePassword(userId, currentPassword, newPassword);
  }
  return apiFetch('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteAccount(password: string) {
  if (useLocalAuth()) {
    const userId = getUserIdFromToken();
    if (!userId) throw new Error('Nicht autorisiert');
    return localDeleteAccount(userId, password);
  }
  return apiFetch('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

export function isNativeOfflineMode(): boolean {
  return useLocalAuth();
}
