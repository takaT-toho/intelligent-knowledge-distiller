
import React, { useState, useCallback } from 'react';
import { LLMProvider, ProcessingState, Category, KnowledgeArticle } from './types';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { OrchestratorSection } from './components/OrchestratorSection';
import { OutputSection } from './components/OutputSection';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/ui/Toast';
import { discoverCategories, categorizeTickets, synthesizeKnowledge } from './services/geminiService';
import { DEFAULT_RAW_TEXT, DEFAULT_SEPARATOR } from './constants';

const App: React.FC = () => {
    const [rawData, setRawData] = useState<string>(DEFAULT_RAW_TEXT);
    const [separator, setSeparator] = useState<string>(DEFAULT_SEPARATOR);
    const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.GEMINI);
    const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [categorizedData, setCategorizedData] = useState<Map<string, string[]>>(new Map());
    const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
    
    const [error, setError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, task: '' });

    const handleProcess = useCallback(async () => {
        if (!process.env.API_KEY) {
            setError("API_KEY environment variable not set. Please configure it to use the AI features.");
            setProcessingState(ProcessingState.ERROR);
            return;
        }

        setError(null);
        setCategories([]);
        setKnowledgeArticles([]);
        setCategorizedData(new Map());

        const tickets = rawData.split(separator).map(t => t.trim()).filter(t => t.length > 0);
        if (tickets.length === 0) {
            setError("No data to process. Please provide some text and a valid separator.");
            setProcessingState(ProcessingState.ERROR);
            return;
        }

        try {
            // Step 1: Discover Categories
            setProcessingState(ProcessingState.DISCOVERING);
            setProgress({ current: 0, total: 1, task: 'Discovering categories...' });
            const discoveredCategories = await discoverCategories(tickets, llmProvider);
            setCategories(discoveredCategories);
            setProgress({ current: 1, total: 1, task: 'Categories discovered!' });

            // Step 2: Categorize Tickets
            setProcessingState(ProcessingState.CATEGORIZING);
            setProgress({ current: 0, total: tickets.length, task: 'Categorizing tickets...' });
            const ticketCategories = await categorizeTickets(tickets, discoveredCategories, llmProvider, (i) => {
                 setProgress({ current: i + 1, total: tickets.length, task: 'Categorizing tickets...' });
            });
            
            const newCategorizedData = new Map<string, string[]>();
            ticketCategories.forEach((cats, i) => {
                if (cats && cats.length > 0) {
                    const categoryName = cats[0].category; // Use first category for simplicity
                     if (!newCategorizedData.has(categoryName)) {
                        newCategorizedData.set(categoryName, []);
                    }
                    newCategorizedData.get(categoryName)?.push(tickets[i]);
                }
            });
            setCategorizedData(newCategorizedData);
            setProgress({ current: tickets.length, total: tickets.length, task: 'Categorization complete!' });

            // Step 3: Synthesize Knowledge
            setProcessingState(ProcessingState.SYNTHESIZING);
            const categoriesToProcess = Array.from(newCategorizedData.keys());
            setProgress({ current: 0, total: categoriesToProcess.length, task: 'Synthesizing knowledge...' });
            const articles: KnowledgeArticle[] = [];
            for (let i = 0; i < categoriesToProcess.length; i++) {
                const categoryName = categoriesToProcess[i];
                const categoryTickets = newCategorizedData.get(categoryName) || [];
                const description = discoveredCategories.find(c => c.name === categoryName)?.description || '';
                
                setProgress({ current: i + 1, total: categoriesToProcess.length, task: `Synthesizing: ${categoryName}` });
                
                const markdownContent = await synthesizeKnowledge(categoryName, description, categoryTickets, llmProvider);
                articles.push({ categoryName, markdownContent });
            }
            setKnowledgeArticles(articles);
            setProgress({ current: categoriesToProcess.length, total: categoriesToProcess.length, task: 'Knowledge synthesis complete!' });
            setProcessingState(ProcessingState.DONE);

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setProcessingState(ProcessingState.ERROR);
        }
    }, [rawData, separator, llmProvider]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <Header onSettingsClick={() => setIsSettingsOpen(true)} />
            <main className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-8">
                        <InputSection
                            rawData={rawData}
                            setRawData={setRawData}
                            separator={separator}
                            setSeparator={setSeparator}
                            onProcess={handleProcess}
                            isLoading={processingState !== ProcessingState.IDLE && processingState !== ProcessingState.DONE && processingState !== ProcessingState.ERROR}
                        />
                        <OrchestratorSection
                            processingState={processingState}
                            categories={categories}
                            progress={progress}
                        />
                    </div>
                    <OutputSection
                        processingState={processingState}
                        articles={knowledgeArticles}
                    />
                </div>
            </main>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                provider={llmProvider}
                setProvider={setLlmProvider}
            />
            {error && <Toast message={error} onClose={() => setError(null)} />}
        </div>
    );
};

export default App;
