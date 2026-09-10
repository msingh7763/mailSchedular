import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import axios from 'axios';

const router = Router();

// GET /api/slack/status
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const token = await prisma.slackToken.findUnique({
      where: { userId },
      select: { teamName: true, channel: true, createdAt: true },
    });

    res.json({
      connected: !!token,
      teamName: token?.teamName || null,
      channel: token?.channel || null,
      connectedAt: token?.createdAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Slack status' });
  }
});

// GET /api/slack/connect - Redirect to Slack OAuth
router.get('/connect', requireAuth, async (req: Request, res: Response) => {
  const scopes = ['incoming-webhook', 'chat:write'].join(',');
  const state = req.user!.userId; // Use userId as state for security

  const authUrl =
    `https://slack.com/oauth/v2/authorize` +
    `?client_id=${config.slack.clientId}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(config.slack.redirectUri)}` +
    `&state=${state}`;

  res.redirect(authUrl);
});

// GET /api/slack/callback - Handle Slack OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    res.redirect(`${config.frontendUrl}?slack_error=${error}`);
    return;
  }

  if (!code || !userId) {
    res.redirect(`${config.frontendUrl}?slack_error=missing_params`);
    return;
  }

  try {
    // Exchange code for token
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: config.slack.redirectUri,
      },
    });

    const data = response.data;
    if (!data.ok) {
      throw new Error(data.error || 'Slack OAuth failed');
    }

    // Store token in DB
    await prisma.slackToken.upsert({
      where: { userId: userId as string },
      update: {
        accessToken: data.access_token,
        teamId: data.team.id,
        teamName: data.team.name,
        webhookUrl: data.incoming_webhook?.url || null,
        channel: data.incoming_webhook?.channel || null,
        botUserId: data.bot_user_id || null,
      },
      create: {
        userId: userId as string,
        accessToken: data.access_token,
        teamId: data.team.id,
        teamName: data.team.name,
        webhookUrl: data.incoming_webhook?.url || null,
        channel: data.incoming_webhook?.channel || null,
        botUserId: data.bot_user_id || null,
      },
    });

    console.log(`[Slack] Connected for user ${userId} to team ${data.team.name}`);
    res.redirect(`${config.frontendUrl}?slack_connected=true&team=${data.team.name}`);
  } catch (err) {
    console.error('[Slack] OAuth callback error:', err);
    res.redirect(`${config.frontendUrl}?slack_error=oauth_failed`);
  }
});

// DELETE /api/slack/disconnect
router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    await prisma.slackToken.deleteMany({ where: { userId } });
    res.json({ message: 'Slack disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

export default router;
