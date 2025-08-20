// src/redis/redis.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import * as crypto from 'crypto';

@Injectable()
export class RedisService {
  private client: RedisClientType;

  constructor(private cfg: ConfigService) {
    this.client = createClient({
      socket: {
        host: this.cfg.get('REDIS_HOST') || 'localhost',
        port: parseInt(this.cfg.get('REDIS_PORT')) || 6379,
      },
      password: this.cfg.get('REDIS_PASSWORD'),
      database: parseInt(this.cfg.get('REDIS_DB')) || 0,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client
      .connect()
      .catch((error) => {
        console.error('❌ Redis connection error:', error);
        process.exit(1);
      })
      .finally(() => {
        console.log('🔴 Redis Connected');
      });
  }

  // Generic get and set methods
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
    }
  }

  // Token Blacklisting Methods
  async blacklistToken(token: string, ttlSeconds?: number): Promise<void> {
    const key = `blacklist:${token}`;
    const value = { blacklistedAt: new Date().toISOString() };
    await this.set(key, value, ttlSeconds || 3600); // 1 hour default
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    const result = await this.get(key);
    return !!result;
  }

  async removeTokenFromBlacklist(token: string): Promise<void> {
    const key = `blacklist:${token}`;
    await this.del(key);
  }

  async blacklistAllUserTokens(
    userId: string,
    ttlSeconds?: number,
  ): Promise<void> {
    const key = `user_blacklist:${userId}`;
    const value = { blacklistedAt: new Date().toISOString() };
    await this.set(key, value, ttlSeconds || 86400); // 24 hours default
  }

  async areUserTokensBlacklisted(userId: string): Promise<boolean> {
    const key = `user_blacklist:${userId}`;
    const result = await this.get(key);
    return !!result;
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.client.flushDb();
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }

  // Session Management
  async createSession(
    userId: string,
    sessionData: any,
    ttlSeconds: number = 86400,
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const key = `session:${sessionId}`;
    const session = {
      userId,
      ...(sessionData as Record<string, unknown>),
      createdAt: new Date().toISOString(),
    };
    await this.set(key, session, ttlSeconds);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async destroySession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    // This would require a more complex implementation with key scanning
    // For now, we'll use the user blacklist approach
    await this.blacklistAllUserTokens(userId);
  }
}
