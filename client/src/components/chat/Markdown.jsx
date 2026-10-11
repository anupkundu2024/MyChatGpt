import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock.jsx';

const remarkPlugins = [remarkGfm];
// detect: false only highlights fences with a language tag; unknown languages stay plain.
const rehypePlugins = [[rehypeHighlight, { detect: false }]];

const components = {
  pre: CodeBlock,
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  table: ({ node: _node, ...props }) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
};

// Raw HTML in model output is not rendered (react-markdown escapes it by default).
function Markdown({ children, streaming = false }) {
  return (
    <div className={`markdown ${streaming ? 'streaming-cursor' : ''}`}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
