import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposeEmailModal } from '../components/ComposeEmailModal';
import { SlackConnect } from '../components/SlackConnect';
import { scheduleEmail, getEmails, searchEmails } from '../api/emails';
import type { Email, ComposeEmailData } from '../types';
import { useAuth } from '../context/AuthContext';

const BULL_BOARD_URL = 'http://localhost:5000/admin/queues';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchQuery, 400);

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getEmails(activeTab);
      setEmails(data.emails);
      if (activeTab === 'scheduled') setTotalScheduled(data.pagination.total);
      else setTotalSent(data.pagination.total);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setError('Failed to load emails. Make sure the backend server is running.');
      }
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  const fetchSearchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      fetchEmails();
      return;
    }
    setIsLoading(true);
    try {
      const data = await searchEmails(q);
      const mapped: Email[] = data.results.map((r: any) => ({
        id: r.id,
        subject: r.highlight?.subject?.[0]?.replace(/<[^>]+>/g, '') || r.subject,
        body: r.highlight?.body?.[0]?.replace(/<[^>]+>/g, '') || r.body,
        fromEmail: r.fromEmail,
        fromName: r.fromName,
        recipients: r.recipients || [],
        status: r.status?.toLowerCase() || 'scheduled',
        createdAt: r.createdAt,
        scheduledAt: r.scheduledAt,
        sentAt: r.sentAt,
      }));
      setEmails(mapped);
    } catch {
      fetchEmails();
    } finally {
      setIsLoading(false);
    }
  }, [fetchEmails]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    if (debouncedSearch) {
      fetchSearchResults(debouncedSearch);
    } else {
      fetchEmails();
    }
  }, [debouncedSearch]);

  // Fetch counts for both tabs
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [sched, sent] = await Promise.all([
          getEmails('scheduled', 1),
          getEmails('sent', 1),
        ]);
        setTotalScheduled(sched.pagination.total);
        setTotalSent(sent.pagination.total);
      } catch {}
    };
    fetchCounts();
  }, [emails]);

  const handleComposeSubmit = async (data: ComposeEmailData) => {
    setIsLoading(true);
    setError('');
    try {
      await scheduleEmail(data);
      setIsComposeOpen(false);
      setSuccessMessage('✓ Email campaign scheduled successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      setActiveTab('scheduled');
      fetchEmails();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to schedule email');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700',
      sending: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      partial: 'bg-orange-100 text-orange-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm p-6 flex flex-col">
        {/* Logo */}
        <div className="text-2xl font-bold text-gray-900 mb-8">ReachInbox</div>

        {/* User Profile */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Compose Button */}
        <button
          onClick={() => setIsComposeOpen(true)}
          className="w-full bg-white border-2 border-green-500 text-green-600 font-semibold py-2 rounded-full hover:bg-green-50 transition mb-6"
        >
          + Compose
        </button>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          <button
            onClick={() => { setActiveTab('scheduled'); setSearchQuery(''); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'scheduled' ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 text-left">Scheduled</span>
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{totalScheduled}</span>
          </button>

          <button
            onClick={() => { setActiveTab('sent'); setSearchQuery(''); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'sent' ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="flex-1 text-left">Sent</span>
            <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{totalSent}</span>
          </button>

          {/* Bull Board Link */}
          <a
            href={BULL_BOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="flex-1 text-left text-sm">Queue Dashboard ↗</span>
          </a>
        </nav>

        {/* Slack Connect */}
        <SlackConnect />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition text-sm"
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {activeTab === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeTab === 'scheduled'
                ? 'Emails waiting to be sent'
                : 'Successfully delivered emails'}
            </p>
          </div>
          {/* Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search emails... (powered by Elasticsearch)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="m-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">
                {searchQuery ? 'No emails match your search' : `No ${activeTab} emails`}
              </p>
              {!searchQuery && activeTab === 'scheduled' && (
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition"
                >
                  Schedule your first email
                </button>
              )}
            </div>
          ) : (
            <div>
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="bg-white border-b border-gray-100 px-8 py-4 hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{email.subject}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(email.status)}`}>
                          {email.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mb-2">{email.body}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>From: {email.fromEmail}</span>
                        <span>·</span>
                        <span>{email.recipients.length} recipient{email.recipients.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>
                          {activeTab === 'scheduled'
                            ? `Scheduled: ${formatDate(email.scheduledAt || email.startTime)}`
                            : `Sent: ${formatDate(email.sentAt)}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(email.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSubmit={handleComposeSubmit}
        isLoading={isLoading}
        fromEmail={user?.email}
      />
    </div>
  );
};
