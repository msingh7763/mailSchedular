import { getRedis } from '../lib/redis';
import { config } from '../config';

// Lua script for atomic check-and-increment
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current == false then
  redis.call('SET', key, 1, 'EX', window)
  return 1
end

current = tonumber(current)
if current >= limit then
  return -1
end

redis.call('INCR', key)
return current + 1
`;

function getHourWindowKey(userId: string, fromEmail: string): string {
  const now = new Date();
  const hourWindow = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
  return `rate:${userId}:${fromEmail}:${hourWindow}`;
}

export function getNextHourStart(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  return nextHour.getTime();
}

export async function checkAndIncrementRateLimit(
  userId: string,
  fromEmail: string,
  limit?: number
): Promise<{ allowed: boolean; count: number; retryAfterMs: number }> {
  const redis = getRedis();
  const key = getHourWindowKey(userId, fromEmail);
  const effectiveLimit = limit ?? config.rateLimit.maxEmailsPerHourPerSender;
  const windowSeconds = 3600;

  const result = await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    key,
    String(effectiveLimit),
    String(windowSeconds)
  ) as number;

  if (result === -1) {
    return {
      allowed: false,
      count: effectiveLimit,
      retryAfterMs: getNextHourStart() - Date.now(),
    };
  }

  return {
    allowed: true,
    count: result,
    retryAfterMs: 0,
  };
}

export async function getRateLimitCount(userId: string, fromEmail: string): Promise<number> {
  const redis = getRedis();
  const key = getHourWindowKey(userId, fromEmail);
  const value = await redis.get(key);
  return value ? parseInt(value, 10) : 0;
}
