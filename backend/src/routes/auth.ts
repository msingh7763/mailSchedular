import { Router, Request, Response } from 'express';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { generateToken } from '../middleware/auth';
import { config } from '../config';

const router = Router();
const googleClient = new OAuth2Client(config.google.clientId);
const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(key, 'hex');
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function createAuthResponse(user: { id: string; email: string; name: string; avatar: string | null }) {
  return {
    token: generateToken({ userId: user.id, email: user.email, name: user.name }),
    user,
  };
}

// POST /api/auth/register - Create an email/password account
router.post('/register', async (req: Request, res: Response) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const { password } = req.body;

  if (!email || !name || !isValidPassword(password)) {
    res.status(400).json({ error: 'Name, a valid email, and a password of at least 8 characters are required' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const user = await prisma.user.create({
      data: { email, name, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true, avatar: true },
    });

    res.status(201).json(createAuthResponse(user));
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ error: 'Could not create account' });
  }
});

// POST /api/auth/login - Authenticate an email/password account
router.post('/login', async (req: Request, res: Response) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const { password } = req.body;

  if (!email || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.json(createAuthResponse({ id: user.id, email: user.email, name: user.name, avatar: user.avatar }));
  } catch (err) {
    console.error('[Auth] Email login error:', err);
    res.status(500).json({ error: 'Could not log in' });
  }
});

// POST /api/auth/google - Exchange Google ID token for our JWT
router.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400).json({ error: 'Google credential is required' });
    return;
  }

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email,
        name: payload.name || payload.email,
        avatar: payload.picture || null,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        avatar: payload.picture || null,
      },
    });

    // Generate our JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('[Auth] Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const jwt = await import('jsonwebtoken');
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string; name: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatar: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
