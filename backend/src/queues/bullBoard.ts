import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './emailQueue';

export function createBullBoardRouter() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue) as any],
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'ReachInbox Email Scheduler',
        miscLinks: [
          { text: 'Back to Dashboard', url: 'http://localhost:3000' },
        ],
      },
    },
  });

  return serverAdapter.getRouter();
}

