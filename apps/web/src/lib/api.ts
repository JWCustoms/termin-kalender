export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

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

export async function register(email: string, password: string, name: string) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  }) as Promise<{ token: string; user: User }>;
}

export async function login(email: string, password: string) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }) as Promise<{ token: string; user: User }>;
}

export async function getMe() {
  return apiFetch('/auth/me') as Promise<{ user: User }>;
}

export async function updateProfile(name: string) {
  return apiFetch('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  }) as Promise<{ user: User }>;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteAccount(password: string) {
  return apiFetch('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
