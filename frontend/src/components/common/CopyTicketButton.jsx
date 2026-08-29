import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * CopyTicketButton:
 * Reusable, compact copy button and badge for ticket IDs.
 * Provides instant feedback (check icon + tooltip) on click.
 */
export default function CopyTicketButton({ 
  ticketNumber, 
  variant = 'badge', // 'badge' | 'icon-only'
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  if (!ticketNumber) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center justify-center text-slate-400 hover:text-[#5eead4] hover:scale-110 p-0.5 rounded transition-all cursor-pointer ${className}`}
        title={copied ? "Copied to clipboard!" : `Copy Ticket ID (${ticketNumber})`}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#2dd4bf] animate-in zoom-in" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 bg-[#0c2e28] px-2.5 py-0.5 rounded-lg border border-[#175249] text-xs font-mono font-bold text-[#2dd4bf] ${className}`}>
      <span>{ticketNumber}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="text-slate-400 hover:text-[#5eead4] hover:scale-110 p-0.5 rounded transition-all cursor-pointer flex-shrink-0"
        title={copied ? "Copied to clipboard!" : `Copy ${ticketNumber}`}
      >
        {copied ? (
          <Check className="w-3 h-3 text-[#2dd4bf] animate-in zoom-in" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
