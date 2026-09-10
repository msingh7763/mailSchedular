import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://admin:secret@localhost:5432/emaildb'),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },

  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
    expiry: process.env.JWT_EXPIRY || '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
  },

  rateLimit: {
    maxEmailsPerHourPerSender: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '200', 10),
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    minDelayBetweenEmailsMs: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000', 10),
  },

  bullBoard: {
    user: process.env.BULL_BOARD_USER || 'admin',
    password: process.env.BULL_BOARD_PASSWORD || 'admin123',
  },
};
