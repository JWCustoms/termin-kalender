import type { User } from '@/lib/api';

interface LocalUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

const STORAGE_KEY = 'termin-kalender-local-users';

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readUsers(): LocalUserRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeUsers(users: LocalUserRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function toUser(record: LocalUserRecord): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    createdAt: record.createdAt,
  };
}

export async function localRegister(
  email: string,
  password: string,
  name: string
): Promise<{ token: string; user: User }> {
  const users = readUsers();
  const normalized = email.toLowerCase().trim();

  if (users.some((u) => u.email === normalized)) {
    throw new Error('E-Mail bereits registriert');
  }

  const record: LocalUserRecord = {
    id: crypto.randomUUID(),
    email: normalized,
    name: name.trim(),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(record);
  writeUsers(users);

  return { token: `local-${record.id}`, user: toUser(record) };
}

export async function localLogin(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const users = readUsers();
  const normalized = email.toLowerCase().trim();
  const record = users.find((u) => u.email === normalized);

  if (!record) {
    throw new Error('Ungültige Anmeldedaten');
  }

  const hash = await hashPassword(password);
  if (record.passwordHash !== hash) {
    throw new Error('Ungültige Anmeldedaten');
  }

  return { token: `local-${record.id}`, user: toUser(record) };
}

export async function localUpdateProfile(userId: string, name: string): Promise<{ user: User }> {
  const users = readUsers();
  const record = users.find((u) => u.id === userId);
  if (!record) throw new Error('Benutzer nicht gefunden');

  record.name = name.trim();
  writeUsers(users);
  return { user: toUser(record) };
}

export async function localChangePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const users = readUsers();
  const record = users.find((u) => u.id === userId);
  if (!record) throw new Error('Benutzer nicht gefunden');

  const hash = await hashPassword(currentPassword);
  if (record.passwordHash !== hash) {
    throw new Error('Aktuelles Passwort ist falsch');
  }

  record.passwordHash = await hashPassword(newPassword);
  writeUsers(users);
}

export async function localDeleteAccount(userId: string, password: string): Promise<void> {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('Benutzer nicht gefunden');

  const hash = await hashPassword(password);
  if (users[index].passwordHash !== hash) {
    throw new Error('Passwort ist falsch');
  }

  users.splice(index, 1);
  writeUsers(users);
}

export function getLocalUserFromToken(token: string | null): User | null {
  if (!token?.startsWith('local-')) return null;
  const userId = token.slice(6);
  const record = readUsers().find((u) => u.id === userId);
  return record ? toUser(record) : null;
}
