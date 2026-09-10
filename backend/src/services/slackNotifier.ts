import { WebClient } from '@slack/web-api';
import { prisma } from '../lib/prisma';

export async function notifyRateLimitHit(
  userId: string,
  fromEmail: string,
  limit: number,
  remainingMs: number
): Promise<void> {
  try {
    const slackToken = await prisma.slackToken.findUnique({
      where: { userId },
    });

    if (!slackToken) {
      console.log(`[Slack] No Slack token for user ${userId}, skipping notification`);
      return;
    }

    const minutesUntilReset = Math.ceil(remainingMs / 60000);
    const message = [
      `🚨 *Rate Limit Reached*`,
      ``,
      `Sender *${fromEmail}* has hit the hourly email limit of *${limit}* emails.`,
      ``,
      `⏰ Next window opens in *${minutesUntilReset} minutes*.`,
      `Affected emails have been automatically rescheduled for the next hour window.`,
    ].join('\n');

    if (slackToken.webhookUrl) {
      // Use Incoming Webhook
      const response = await fetch(slackToken.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: message },
            },
          ],
        }),
      });
      if (!response.ok) {
        console.error('[Slack] Webhook failed:', response.statusText);
      } else {
        console.log(`[Slack] Rate limit notification sent for ${fromEmail}`);
      }
    } else if (slackToken.accessToken && slackToken.channel) {
      // Use Bot token
      const client = new WebClient(slackToken.accessToken);
      await client.chat.postMessage({
        channel: slackToken.channel,
        text: message,
      });
      console.log(`[Slack] Rate limit notification sent for ${fromEmail}`);
    }
  } catch (err) {
    // Non-fatal: log but don't crash the worker
    console.error('[Slack] Failed to send notification:', err);
  }
}
