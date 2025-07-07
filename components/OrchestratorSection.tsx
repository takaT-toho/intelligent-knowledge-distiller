
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
import { ProcessingState, Category } from '../types';
import { Spinner } from './ui/Spinner';

interface OrchestratorSectionProps {
    processingState: ProcessingState;
    categories: Category[];
    progress: { current: number; total: number; task: string };
}

const StateIndicator: React.FC<{ title: string; active: boolean; done: boolean }> = ({ title, active, done }) => (
    <div className="flex items-center space-x-3">
        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${done ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-gray-600'}`}>
            {active && <Spinner size="sm" />}
            {done && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <span className={`font-medium ${active || done ? 'text-white' : 'text-gray-400'}`}>{title}</span>
    </div>
);

export const OrchestratorSection: React.FC<OrchestratorSectionProps> = ({ processingState, categories, progress }) => {
    const { t } = useTranslation();
    const isDiscovering = processingState === ProcessingState.DISCOVERING;
    const isCategorizing = processingState === ProcessingState.CATEGORIZING;
    const isSynthesizing = processingState === ProcessingState.SYNTHESIZING;

    const doneDiscovering = processingState !== ProcessingState.IDLE && processingState !== ProcessingState.DISCOVERING;
    const doneCategorizing = doneDiscovering && processingState !== ProcessingState.CATEGORIZING;
    const doneSynthesizing = processingState === ProcessingState.DONE;

    const showProgress = isDiscovering || isCategorizing || isSynthesizing || processingState === ProcessingState.DONE;

    return (
        <Card>
            <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">{t('orchestratorSection.title')}</h2>
                <div className="space-y-4">
                    <StateIndicator title={t('orchestratorSection.discoverCategories')} active={isDiscovering} done={doneDiscovering} />
                    <StateIndicator title={t('orchestratorSection.categorizeData')} active={isCategorizing} done={doneCategorizing} />
                    <StateIndicator title={t('orchestratorSection.synthesizeKnowledge')} active={isSynthesizing} done={doneSynthesizing} />
                </div>
                {showProgress && (
                    <div className="mt-6">
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-blue-400">{progress.task}</span>
                            {progress.total > 1 && <span className="text-sm font-medium text-blue-400">{progress.current} / {progress.total}</span>}
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                        </div>
                    </div>
                )}
                {categories.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-md font-semibold text-white mb-3">{t('orchestratorSection.discoveredCategories')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat, index) => (
                                <span key={index} className="px-2.5 py-1 text-sm font-medium rounded-full bg-gray-700 text-gray-300">
                                    {cat.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
