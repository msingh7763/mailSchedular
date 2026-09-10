import { Client } from '@elastic/elasticsearch';
import { config } from '../config';

export const esClient = new Client({
  node: config.elasticsearch.url,
});

export const EMAIL_INDEX = 'emails';

export async function setupElasticsearchIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAIL_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            subject: { type: 'text', analyzer: 'standard' },
            body: { type: 'text', analyzer: 'standard' },
            fromEmail: { type: 'keyword' },
            fromName: { type: 'keyword' },
            status: { type: 'keyword' },
            recipients: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${EMAIL_INDEX}' created`);
    } else {
      console.log(`[Elasticsearch] Index '${EMAIL_INDEX}' already exists`);
    }
  } catch (err) {
    console.error('[Elasticsearch] Index setup failed:', err);
    // Non-fatal - app continues even if ES is down
  }
}

export async function indexEmail(emailData: {
  id: string;
  userId: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  status: string;
  recipients: string[];
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}): Promise<void> {
  try {
    await esClient.index({
      index: EMAIL_INDEX,
      id: emailData.id,
      document: {
        ...emailData,
        scheduledAt: emailData.scheduledAt.toISOString(),
        sentAt: emailData.sentAt?.toISOString() || null,
        createdAt: emailData.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[Elasticsearch] Failed to index email:', err);
  }
}
