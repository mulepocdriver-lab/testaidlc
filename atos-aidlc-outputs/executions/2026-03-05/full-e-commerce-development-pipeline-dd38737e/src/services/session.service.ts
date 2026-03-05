import { v4 as uuid } from 'uuid';
import { redis } from '../lib/redis';
import { config } from '../config';

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';

  async createSession(userId: string, metadata?: { userAgent?: string; ipAddress?: string }): Promise<string> {
    const sessionId = uuid();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.session.refreshTokenExpiry * 1000);

    const session: Session = {
      id: sessionId,
      userId,
      createdAt: now,
      expiresAt,
      ...metadata,
    };

    await redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      config.session.refreshTokenExpiry,
      JSON.stringify(session)
    );

    await redis.sadd(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);

    return sessionId;
  }

  async validateRefreshToken(token: string): Promise<Session | null> {
    const data = await redis.get(`${this.SESSION_PREFIX}${token}`);
    if (!data) return null;

    const session: Session = JSON.parse(data);
    
    if (new Date(session.expiresAt) < new Date()) {
      await this.invalidateSession(token);
      return null;
    }

    return session;
  }

  async invalidateSession(token: string): Promise<void> {
    const data = await redis.get(`${this.SESSION_PREFIX}${token}`);
    if (data) {
      const session: Session = JSON.parse(data);
      await redis.srem(`${this.USER_SESSIONS_PREFIX}${session.userId}`, token);
    }
    await redis.del(`${this.SESSION_PREFIX}${token}`);
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessions = await redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    
    for (const sessionId of sessions) {
      await redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    }
    
    await redis.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = await redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const data = await redis.get(`${this.SESSION_PREFIX}${sessionId}`);
      if (data) {
        sessions.push(JSON.parse(data));
      }
    }

    return sessions;
  }
}
