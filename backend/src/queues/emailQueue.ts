import { Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { config } from '../config';

export interface EmailJobData {
  emailId: string;
  recipientId: string;
  recipientAddress: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  userId: string;
  hourlyLimit: number;
  delayBetweenEmails: number;
}

export const EMAIL_QUEUE_NAME = 'email-sending';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // Keep completed jobs for 7 days
      count: 10000,
    },
    removeOnFail: {
      age: 30 * 24 * 60 * 60, // Keep failed jobs for 30 days
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

console.log(`[Queue] Email queue '${EMAIL_QUEUE_NAME}' initialized`);
