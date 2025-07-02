import React from 'react';
import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold my-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-semibold my-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-semibold my-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                p: ({node, ...props}) => <p className="my-2" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-400 hover:underline" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="pl-4 border-l-4 border-gray-500 italic my-2" {...props} />,
                code: ({node, inline, className, children, ...props}: ComponentProps<'code'> & {node?: any, inline?: boolean}) => {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline ? (
                      <pre className="bg-gray-900 p-3 rounded-md my-2 overflow-x-auto"><code className={className} {...props}>{children}</code></pre>
                    ) : (
                      <code className="bg-gray-700 text-red-300 rounded-md px-1.5 py-0.5" {...props}>
                        {children}
                      </code>
                    )
                }
            }}
        >
            {content}
        </ReactMarkdown>
    );
};