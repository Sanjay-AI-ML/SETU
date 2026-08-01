import { useState } from 'react';

export default function ShareButton({ title = 'SETU Communication Assessment', text = '', url = window.location.href, className = 'btn btn-secondary' }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title,
      text: text || 'Check out this SETU Communication Matrix assessment summary.',
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, falling back to clipboard:', err);
        } else {
          return;
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      const copyText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (clipboardErr) {
      console.error('Clipboard copy failed:', clipboardErr);
    }
  }

  return (
    <button type="button" onClick={handleShare} className={className}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
      </svg>
      <span>{copied ? 'Copied summary!' : 'Share report'}</span>
    </button>
  );
}
