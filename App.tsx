
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LLMProvider, ProcessingState, Category, KnowledgeArticle, ProcessingMode } from './types';
import { LLMServiceFactory } from './services';
import { 
    getCategoryDiscoveryPrompt,
    getTicketCategorizationPrompt,
    getKnowledgeSynthesisPrompt,
    getSubcategoryDiscoveryPrompt,
    getSubcategoryCategorizationPrompt
} from './constants';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { OrchestratorSection } from './components/OrchestratorSection';
import { OutputSection } from './components/OutputSection';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/ui/Toast';
import { DEFAULT_SEPARATOR, SUBCATEGORY_THRESHOLD } from './constants';

const App: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [rawData, setRawData] = useState<string>(t('sampleText'));
    const [separator, setSeparator] = useState<string>(DEFAULT_SEPARATOR);
    const [domain, setDomain] = useState<string>('Supply Chain');
    const [processingMode, setProcessingMode] = useState<ProcessingMode>(ProcessingMode.SIMPLE);
    const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.GEMINI);
    const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [categorizedData, setCategorizedData] = useState<Map<string, string[]>>(new Map());
    const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
    
    const [error, setError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, task: '' });
    const [openaiApiKey, setOpenaiApiKey] = useState<string>(process.env.OPENAI_API_KEY || "");
    const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>("https://api.openai.com/v1");
    const [openaiModel, setOpenaiModel] = useState<string>("");

    useEffect(() => {
        setRawData(t('sampleText'));
    }, [i18n.language, t]);

    const handleProcess = useCallback(async () => {
        if (llmProvider === LLMProvider.GEMINI && !process.env.GEMINI_API_KEY) {
            setError("GEMINI_API_KEY environment variable not set. Please configure it in .env.local to use the Gemini API.");
            setProcessingState(ProcessingState.ERROR);
            return;
        }
        
        const finalOpenAiApiKey = openaiApiKey || process.env.OPENAI_API_KEY;
        if (llmProvider === LLMProvider.OPENAI && !finalOpenAiApiKey) {
            setError("OpenAI API Key not set. Please configure it in the settings or in your environment variables.");
            setProcessingState(ProcessingState.ERROR);
            return;
        }

        setError(null);
        setCategories([]);
        setKnowledgeArticles([]);

        const tickets = rawData.split(separator).map(t => t.trim()).filter(t => t.length > 0);
        if (tickets.length === 0) {
            setError("No data to process. Please provide some text and a valid separator.");
            setProcessingState(ProcessingState.ERROR);
            return;
        }

        try {
            const llmService = LLMServiceFactory.getService(llmProvider, {
                apiKey: llmProvider === LLMProvider.OPENAI ? finalOpenAiApiKey : undefined,
                baseURL: llmProvider === LLMProvider.OPENAI ? openaiBaseUrl : undefined,
                model: llmProvider === LLMProvider.OPENAI ? openaiModel : undefined
            });

            const getFinalPrompt = async (basePrompt: string) => {
                if (processingMode === ProcessingMode.DYNAMIC) {
                    return await llmService.optimizePrompt(basePrompt, domain);
                }
                return basePrompt;
            };

            const systemPrompt = t('prompts.system.main');

            // Step 1: Discover Categories
            setProcessingState(ProcessingState.DISCOVERING);
            setProgress({ current: 0, total: 1, task: t('progress.discovering') });
            const categoryDiscoveryPrompt = await getFinalPrompt(getCategoryDiscoveryPrompt(t, domain, tickets));
            const discoveredCategories = await llmService.discoverCategories(categoryDiscoveryPrompt, systemPrompt);
            setCategories(discoveredCategories);
            setProgress({ current: 1, total: 1, task: t('progress.categoriesDiscovered') });

            // Step 2: Categorize Tickets
            setProcessingState(ProcessingState.CATEGORIZING);
            setProgress({ current: 0, total: tickets.length, task: t('progress.categorizing') });
            const categoryListJson = JSON.stringify(discoveredCategories, null, 2);
            const categorizationPrompts = tickets.map(ticket => {
                const [title, description] = ticket.split('\nDescription: ');
                return getTicketCategorizationPrompt(t, domain, title.replace('Title: ', ''), description, categoryListJson);
            });
            // Dynamic prompt optimization for categorization is complex, skipping for now.
            const ticketCategories = await llmService.categorizeTickets(
                categorizationPrompts, 
                (i) => {
                    setProgress({ current: i + 1, total: tickets.length, task: t('progress.categorizing') });
                },
                systemPrompt
            );
            
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
            setProgress({ current: tickets.length, total: tickets.length, task: t('progress.categorizationComplete') });

            // Step 3: Synthesize Knowledge
            setProcessingState(ProcessingState.SYNTHESIZING);
            const categoriesToProcess = Array.from(newCategorizedData.keys());
            setProgress({ current: 0, total: categoriesToProcess.length, task: t('progress.synthesizing') });
            const articles: KnowledgeArticle[] = [];
            for (let i = 0; i < categoriesToProcess.length; i++) {
                const categoryName = categoriesToProcess[i];
                const categoryTickets = newCategorizedData.get(categoryName) || [];
                const description = discoveredCategories.find(c => c.name === categoryName)?.description || '';
                
                setProgress({ current: i + 1, total: categoriesToProcess.length, task: t('progress.processing', { categoryName }) });

                if (categoryTickets.length > SUBCATEGORY_THRESHOLD) {
                    // Sub-category discovery and synthesis for large categories
                    setProgress({ current: i + 1, total: categoriesToProcess.length, task: t('progress.discoveringSub', { categoryName }) });
                    const subcategoryDiscoveryPrompt = await getFinalPrompt(getSubcategoryDiscoveryPrompt(t, domain, categoryName, description, categoryTickets.join('\n\n---\n\n')));
                    const subcategories = await llmService.discoverSubcategories(subcategoryDiscoveryPrompt, systemPrompt);

                    if (subcategories.length > 0) {
                        setProgress({ current: i + 1, total: categoriesToProcess.length, task: t('progress.categorizingSub', { categoryName }) });
                        const subcategoryListJson = JSON.stringify(subcategories, null, 2);
                        const subCategorizationPrompts = categoryTickets.map(ticket => {
                            const [title, description] = ticket.split('\nDescription: ');
                            return getSubcategoryCategorizationPrompt(t, domain, title.replace('Title: ', ''), description, categoryName, description, subcategoryListJson);
                        });
                        const subTicketCategories = await llmService.categorizeToSubcategories(subCategorizationPrompts, () => {}, systemPrompt);
                        
                        const subCategorizedData = new Map<string, string[]>();
                        subTicketCategories.forEach((subCats, ticketIndex) => {
                            if (subCats && subCats.length > 0) {
                                const subCategoryName = subCats[0].subcategory;
                                if (!subCategorizedData.has(subCategoryName)) {
                                    subCategorizedData.set(subCategoryName, []);
                                }
                                subCategorizedData.get(subCategoryName)?.push(categoryTickets[ticketIndex]);
                            }
                        });

                        const subCategoriesToProcess = Array.from(subCategorizedData.keys());
                        for (const subCategoryName of subCategoriesToProcess) {
                            const subCategoryTickets = subCategorizedData.get(subCategoryName) || [];
                            const subCategoryDescription = subcategories.find(sc => sc.name === subCategoryName)?.description || '';
                            
                            setProgress({ current: i + 1, total: categoriesToProcess.length, task: t('progress.synthesizingSub', { categoryName, subCategoryName }) });
                            
                            const knowledgeSynthesisPrompt = await getFinalPrompt(getKnowledgeSynthesisPrompt(t, domain, subCategoryName, subCategoryDescription, subCategoryTickets));
                            const markdownContent = await llmService.synthesizeKnowledge(knowledgeSynthesisPrompt, systemPrompt);
                            articles.push({ categoryName: `${categoryName} > ${subCategoryName}`, markdownContent });
                        }
                    } else {
                        // If no subcategories are found, process the main category
                        const knowledgeSynthesisPrompt = await getFinalPrompt(getKnowledgeSynthesisPrompt(t, domain, categoryName, description, categoryTickets));
                        const markdownContent = await llmService.synthesizeKnowledge(knowledgeSynthesisPrompt, systemPrompt);
                        articles.push({ categoryName: `${categoryName} (Large Category)`, markdownContent });
                    }
                } else {
                    // Standard synthesis for smaller categories
                    const knowledgeSynthesisPrompt = await getFinalPrompt(getKnowledgeSynthesisPrompt(t, domain, categoryName, description, categoryTickets));
                    const markdownContent = await llmService.synthesizeKnowledge(knowledgeSynthesisPrompt, systemPrompt);
                    articles.push({ categoryName, markdownContent });
                }
            }
            setKnowledgeArticles(articles);
            setProgress({ current: categoriesToProcess.length, total: categoriesToProcess.length, task: t('progress.synthesisComplete') });
            setProcessingState(ProcessingState.DONE);

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setProcessingState(ProcessingState.ERROR);
        }
    }, [rawData, separator, llmProvider, openaiApiKey, openaiBaseUrl, openaiModel, t, domain, processingMode]);

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
                            domain={domain}
                            setDomain={setDomain}
                            processingMode={processingMode}
                            setProcessingMode={setProcessingMode}
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
                openaiApiKey={openaiApiKey}
                setOpenaiApiKey={setOpenaiApiKey}
                openaiBaseUrl={openaiBaseUrl}
                setOpenaiBaseUrl={setOpenaiBaseUrl}
                openaiModel={openaiModel}
                setOpenaiModel={setOpenaiModel}
            />
            {error && <Toast message={error} onClose={() => setError(null)} />}
        </div>
    );
};

export default App;
