export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface EmailRecipientDetail {
  id: string;
  address: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  sentAt?: string;
}

export interface Email {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  recipients: string[];
  recipientDetails?: EmailRecipientDetail[];
  status: 'scheduled' | 'sent' | 'draft' | 'sending' | 'failed' | 'partial';
  createdAt: string;
  sentAt?: string;
  scheduledAt?: string;
  startTime?: string;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentialResponse: any) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface ComposeEmailData {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  channel: string | null;
  connectedAt: string | null;
}

export interface SearchResult {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  status: string;
  recipients: string[];
  scheduledAt: string;
  highlight?: {
    subject?: string[];
    body?: string[];
  };
}

export interface PaginatedEmails {
  emails: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
