
import React from 'react';
import { Card } from './ui/Card';
import { ProcessingState, KnowledgeArticle } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DownloadIcon } from './icons/DownloadIcon';
import { Spinner } from './ui/Spinner';

interface OutputSectionProps {
    processingState: ProcessingState;
    articles: KnowledgeArticle[];
}

export const OutputSection: React.FC<OutputSectionProps> = ({ processingState, articles }) => {
    const handleDownload = (article: KnowledgeArticle) => {
        const blob = new Blob([article.markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${article.categoryName.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderContent = () => {
        switch (processingState) {
            case ProcessingState.IDLE:
                return <div className="text-center text-gray-400">Output will be displayed here after processing.</div>;
            case ProcessingState.ERROR:
                 return <div className="text-center text-red-400">An error occurred. Please check the error message and try again.</div>;
            case ProcessingState.DISCOVERING:
            case ProcessingState.CATEGORIZING:
            case ProcessingState.SYNTHESIZING:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Spinner size="lg" />
                        <p className="mt-4">Generating knowledge articles...</p>
                    </div>
                );
            case ProcessingState.DONE:
                if (articles.length === 0) {
                    return <div className="text-center text-gray-400">Processing complete, but no knowledge articles were generated. This might happen if no categories were found or data could not be categorized.</div>;
                }
                return (
                    <div className="space-y-4">
                        {articles.map((article, index) => (
                            <Card key={index} className="bg-gray-800/50">
                                <div className="p-5">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-lg font-semibold text-blue-400">{article.categoryName}</h3>
                                        <button onClick={() => handleDownload(article)} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" aria-label="Download article">
                                            <DownloadIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                      <MarkdownRenderer content={article.markdownContent} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                );
        }
    };
    
    return (
        <Card className="h-full">
            <div className="p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-4 flex-shrink-0">3. Distilled Knowledge</h2>
                <div className="overflow-y-auto flex-grow h-[calc(100vh-250px)] pr-2">
                   {renderContent()}
                </div>
            </div>
        </Card>
    );
};
