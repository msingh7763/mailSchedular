import { Redis } from 'ioredis';
import { config } from '../config';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(config.redis.url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisInstance.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisInstance.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }
  return redisInstance;
}

export function createRedisConnection(): Redis {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}
