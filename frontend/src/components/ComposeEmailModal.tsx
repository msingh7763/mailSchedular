import React, { useRef, useState } from 'react';

export interface ComposeEmailData {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ComposeEmailData) => void;
  isLoading?: boolean;
  fromEmail?: string;
}

const formatDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  fromEmail = 'oliver.brown@domain.io',
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientText, setRecipientText] = useState('');
  const [startTime, setStartTime] = useState(formatDateTimeLocal(new Date()));
  const [delayBetweenEmails, setDelayBetweenEmails] = useState('60');
  const [hourlyLimit, setHourlyLimit] = useState('50');
  const [error, setError] = useState('');
  const [showSendLater, setShowSendLater] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const addRecipients = (value: string) => {
    const emails = value.split(/[\s,;]+/).map((email) => email.trim()).filter((email) => email && email.includes('@'));
    if (emails.length > 0) setRecipients((current) => [...new Set([...current, ...emails])]);
    setRecipientText('');
  };

  const handleRecipientKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault();
      addRecipients(recipientText);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const emails = content.split(/[\n,;]+/).map((line) => line.trim()).filter((line) => line && line.includes('@'));
    if (emails.length === 0) {
      setError('No valid email addresses found in that file');
      return;
    }
    setRecipients((current) => [...new Set([...current, ...emails])]);
    setError('');
    event.target.value = '';
  };

  const handleBodyInput = (event: React.FormEvent<HTMLDivElement>) => setBody(event.currentTarget.innerHTML);

  const execFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setBody(editorRef.current?.innerHTML || '');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const parsedDelay = parseInt(delayBetweenEmails, 10);
    const parsedLimit = parseInt(hourlyLimit, 10);
    const pendingRecipients = recipientText.split(/[\s,;]+/).filter((email) => email.includes('@'));
    const allRecipients = [...new Set([...recipients, ...pendingRecipients])];

    if (!subject.trim()) return setError('Subject is required');
    if (!body.replace(/<[^>]+>/g, '').trim()) return setError('Email body is required');
    if (allRecipients.length === 0) return setError('Add at least one recipient');
    if (!startTime) return setError('Start time is required');
    if (!Number.isFinite(parsedDelay) || parsedDelay < 1) return setError('Delay must be at least 1 second');
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) return setError('Hourly limit must be at least 1');

    onSubmit({ subject: subject.trim(), body, recipients: allRecipients, startTime, delayBetweenEmails: parsedDelay, hourlyLimit: parsedLimit });
  };

  if (!isOpen) return null;

  return (
    <div className="compose-overlay">
      <form className="compose-window" onSubmit={handleSubmit}>
        <header className="compose-header">
          <button type="button" className="compose-icon-button" onClick={onClose} disabled={isLoading} aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>
          <h1>Compose New Email</h1>
          <div className="compose-header-actions">
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileChange} hidden />
            <button type="button" className="compose-icon-button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} aria-label="Attach recipient list"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.82-2.83l8.49-8.48" /></svg></button>
            <button type="button" className={`compose-icon-button ${showSendLater ? 'is-active' : ''}`} onClick={() => setShowSendLater((open) => !open)} disabled={isLoading} aria-label="Send later"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></button>
            <button type="submit" className="compose-send-button" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send'}</button>
          </div>
        </header>

        <div className="compose-content">
          <div className="compose-fields">
            <div className="compose-field-row"><label htmlFor="compose-from">From</label><select id="compose-from" defaultValue={fromEmail} disabled={isLoading}><option>{fromEmail}</option></select></div>
            <div className="compose-field-row"><label htmlFor="compose-to">To</label><div className="compose-recipient-control">{recipients.map((recipient) => <button type="button" key={recipient} className="recipient-chip" onClick={() => setRecipients(recipients.filter((item) => item !== recipient))}>{recipient} <span>×</span></button>)}<input id="compose-to" value={recipientText} onChange={(event) => setRecipientText(event.target.value)} onKeyDown={handleRecipientKeyDown} onBlur={() => addRecipients(recipientText)} placeholder="recipient@example.com" disabled={isLoading} /></div></div>
            <div className="compose-field-row"><label htmlFor="compose-subject">Subject</label><input id="compose-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" disabled={isLoading} /></div>
          </div>

          <div className="compose-options"><label>Delay between 2 emails <input type="number" min="1" value={delayBetweenEmails} onChange={(event) => setDelayBetweenEmails(event.target.value)} disabled={isLoading} /></label><label>Hourly Limit <input type="number" min="1" value={hourlyLimit} onChange={(event) => setHourlyLimit(event.target.value)} disabled={isLoading} /></label></div>
          {error && <p className="compose-error" role="alert">{error}</p>}

          <div className="compose-editor-shell">
            <div className="compose-editor-placeholder" aria-hidden="true">Type your Reply...</div>
            <div ref={editorRef} className="compose-editor" contentEditable={!isLoading} onInput={handleBodyInput} suppressContentEditableWarning />
            <div className="compose-toolbar" aria-label="Formatting toolbar">
              <button type="button" onClick={() => execFormat('undo')} aria-label="Undo">↶</button><button type="button" onClick={() => execFormat('redo')} aria-label="Redo">↷</button><span className="toolbar-divider" />
              <button type="button" onClick={() => execFormat('formatBlock', 'p')} aria-label="Text style">T<small>↕</small></button><button type="button" onClick={() => execFormat('bold')} aria-label="Bold"><strong>B</strong></button><button type="button" onClick={() => execFormat('italic')} aria-label="Italic"><em>I</em></button><button type="button" onClick={() => execFormat('underline')} aria-label="Underline"><u>U</u></button><span className="toolbar-divider" />
              <button type="button" onClick={() => execFormat('justifyLeft')} aria-label="Align left">≡</button><button type="button" onClick={() => execFormat('insertOrderedList')} aria-label="Numbered list">1·</button><button type="button" onClick={() => execFormat('insertUnorderedList')} aria-label="Bulleted list">•·</button><button type="button" onClick={() => execFormat('outdent')} aria-label="Decrease indent">≪</button><button type="button" onClick={() => execFormat('indent')} aria-label="Increase indent">≫</button><button type="button" onClick={() => execFormat('formatBlock', 'blockquote')} aria-label="Quote">❝</button><button type="button" onClick={() => execFormat('removeFormat')} aria-label="Clear formatting">S̶</button>
            </div>
          </div>
        </div>

        {showSendLater && <aside className="send-later-panel"><h2>Send Later</h2><label htmlFor="send-later-time">Pick date &amp; time</label><input id="send-later-time" type="datetime-local" min={formatDateTimeLocal(new Date())} value={startTime} onChange={(event) => { setStartTime(event.target.value); setSelectedSchedule(''); }} /><div className="send-later-presets">{['Tomorrow, 10:00 AM', 'Tomorrow, 11:00 AM', 'Tomorrow, 3:00 PM'].map((preset) => <button type="button" key={preset} className={selectedSchedule === preset ? 'selected' : ''} onClick={() => setSelectedSchedule(preset)}>{preset}</button>)}</div><div className="send-later-actions"><button type="button" onClick={() => setShowSendLater(false)}>Cancel</button><button type="button" className="done" onClick={() => setShowSendLater(false)}>Done</button></div></aside>}
      </form>
    </div>
  );
};
