import React, { useState, useEffect } from 'react';
import { getSlackStatus, connectSlack, disconnectSlack } from '../api/slack';
import type { SlackStatus } from '../types';

export const SlackConnect: React.FC = () => {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await getSlackStatus();
      setStatus(data);
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchStatus();

    // Handle callback params
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_connected') === 'true') {
      fetchStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('slack_error')) {
      setError(`Slack connection failed: ${params.get('slack_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    setError('');
    try {
      await connectSlack();
    } catch (err) {
      setError('Failed to initiate Slack connection');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnectSlack();
      await fetchStatus();
    } catch {
      setError('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  if (!status) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Slack</p>
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}
      {status.connected ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-700 font-medium">{status.teamName}</span>
          </div>
          {status.channel && (
            <p className="text-xs text-gray-500 mb-2">#{status.channel}</p>
          )}
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="text-xs text-red-500 hover:text-red-700 transition"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.687 8.834a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zM15.166 17.687a2.527 2.527 0 0 1-2.521-2.521 2.526 2.526 0 0 1 2.521-2.521h6.312A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z"/>
          </svg>
          {isLoading ? 'Connecting...' : 'Connect Slack'}
        </button>
      )}
    </div>
  );
};
