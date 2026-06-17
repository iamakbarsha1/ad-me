import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '@ad-me/shared';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface GooglePayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.name) {
    throw new Error('Invalid Google token payload');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

export async function upsertUser(google: GooglePayload) {
  const existing = await db.select().from(users).where(eq(users.googleId, google.sub)).limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    await db.update(users).set({
      name: google.name,
      avatarUrl: google.picture ?? null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
    return user;
  }

  const [newUser] = await db.insert(users).values({
    googleId: google.sub,
    email: google.email,
    name: google.name,
    avatarUrl: google.picture ?? null,
  }).returning();

  return newUser;
}

export function signTokenPair(userId: string, role: string): TokenPair {
  const accessToken = jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: JWT_ACCESS_TTL },
  );

  const refreshToken = jwt.sign(
    { sub: userId, role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: JWT_REFRESH_TTL },
  );

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): { sub: string; role: string } {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
    sub: string;
    role: string;
    type: string;
  };
  if (payload.type !== 'refresh') {
    throw new Error('Not a refresh token');
  }
  return { sub: payload.sub, role: payload.role };
}

export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}
