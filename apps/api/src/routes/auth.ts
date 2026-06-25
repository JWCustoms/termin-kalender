import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserName,
  updateUserPassword,
  deleteUser,
} from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] };
  return jwt.sign({ userId, email }, secret, options);
}

function sanitizeUser(user: { id: string; email: string; name: string; created_at: string }) {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.created_at };
}

router.post('/register', async (req, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'E-Mail, Passwort und Name sind erforderlich' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    return;
  }

  if (findUserByEmail(email)) {
    res.status(409).json({ error: 'E-Mail bereits registriert' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser(uuidv4(), email, passwordHash, name.trim());
  const token = signToken(user.id, user.email);

  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post('/login', async (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'Benutzer nicht gefunden' });
    return;
  }
  res.json({ user: sanitizeUser(user) });
});

router.patch('/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name ist erforderlich' });
    return;
  }
  updateUserName(req.user!.userId, name.trim());
  const user = findUserById(req.user!.userId)!;
  res.json({ user: sanitizeUser(user) });
});

router.patch('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen lang sein' });
    return;
  }

  const user = findUserById(req.user!.userId)!;
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  updateUserPassword(req.user!.userId, passwordHash);
  res.json({ message: 'Passwort erfolgreich geändert' });
});

router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'Passwort zur Bestätigung erforderlich' });
    return;
  }

  const user = findUserById(req.user!.userId)!;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Passwort ist falsch' });
    return;
  }

  deleteUser(req.user!.userId);
  res.json({ message: 'Konto erfolgreich gelöscht' });
});

export default router;
