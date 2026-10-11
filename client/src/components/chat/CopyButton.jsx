import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-secure contexts (plain http on a LAN IP) where the Clipboard API is missing.
    const area = Object.assign(document.createElement('textarea'), { value: text });
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

// tone="onDark" for use on the always-dark code block header.
export default function CopyButton({ getText, label = 'Copy', showText = false, tone = 'default', className = '' }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await writeClipboard(getText());
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className={`inline-flex items-center gap-1.5 rounded-md p-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        tone === 'onDark' ? 'text-[#b4b4b4] hover:text-white' : 'text-muted hover:text-fg'
      } ${className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {showText && <span>{copied ? 'Copied!' : 'Copy'}</span>}
    </button>
  );
}
