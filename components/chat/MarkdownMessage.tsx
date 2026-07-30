"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

function safeHref(href?: string): string | undefined {
  if (!href) return undefined;
  const t = href.trim().toLowerCase();
  if (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("mailto:")
  ) {
    return href;
  }
  return undefined;
}

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ["href"], ["rel"], ["target"]],
  },
};

export default function MarkdownMessage({
  content,
  className = "",
}: MarkdownMessageProps) {
  return (
    <div className={`markdown-agro ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          pre: ({ children }) => <div className="my-1">{children}</div>,
          code: ({ children }) => (
            <span className="text-inherit">{children}</span>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          a: ({ href, children }) => {
            const safe = safeHref(href);
            if (!safe) return <span>{children}</span>;
            return (
              <a
                href={safe}
                target="_blank"
                rel="noopener noreferrer"
                className="text-agro-600 underline hover:text-agro-700"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
