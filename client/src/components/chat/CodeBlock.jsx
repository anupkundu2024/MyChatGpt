import { useRef } from 'react';
import CopyButton from './CopyButton.jsx';

// Fenced code block: language label and copy button above highlighted code.
// `children` is the <code> element produced by react-markdown + rehype-highlight.
// Always dark (in both themes) to match the github-dark highlight.js theme.
export default function CodeBlock({ children, node: _node, ...props }) {
  const preRef = useRef(null);
  const className = children?.props?.className ?? '';
  const language = /language-([\w+#-]+)/.exec(className)?.[1];

  return (
    <div className="code-block overflow-hidden rounded-xl border border-line bg-[#0d0d0d] text-[#e6e6e6]">
      <div className="flex items-center justify-between bg-[#2f2f2f] px-4 py-1.5 text-xs text-[#b4b4b4]">
        <span className="font-mono">{language ?? 'code'}</span>
        <CopyButton getText={() => preRef.current?.innerText ?? ''} label="Copy code" showText tone="onDark" />
      </div>
      <pre ref={preRef} {...props} className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}
