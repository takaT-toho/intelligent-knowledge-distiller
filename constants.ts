import { TFunction } from 'i18next';

export const DEFAULT_SEPARATOR = '--- TICKET BREAK ---';
export const SUBCATEGORY_THRESHOLD = 50;

export const getCategoryDiscoveryPrompt = (t: TFunction, tickets: string[]): string => {
  return t('prompts.categoryDiscovery.main', { tickets: tickets.join('\n\n') });
};

export const getTicketCategorizationPrompt = (t: TFunction, title: string, description: string, categories: string): string => {
    return t('prompts.ticketCategorization.main', { title, description, categories });
};

export const getKnowledgeSynthesisPrompt = (t: TFunction, categoryName: string, categoryDescription: string, tickets: string[]): string => {
    return t('prompts.knowledgeSynthesis.main', { categoryName, categoryDescription, tickets: tickets.join('\n\n---\n\n') });
};

export const getCategoryMergePrompt = (t: TFunction, categorySetsJson: string): string => {
    return t('prompts.categoryMerge.main', { categorySetsJson });
};

export const getSubcategoryDiscoveryPrompt = (t: TFunction, parentCategoryName: string, parentCategoryDescription: string, sampleTickets: string): string => {
    return t('prompts.subcategoryDiscovery.main', { parentCategoryName, parentCategoryDescription, sampleTickets });
};

export const getSubcategoryCategorizationPrompt = (t: TFunction, title: string, description: string, parentCategoryName: string, parentCategoryDescription: string, subcategories: string): string => {
    return t('prompts.subcategoryCategorization.main', { title, description, parentCategoryName, parentCategoryDescription, subcategories });
};

export const getKnowledgeMergePrompt = (t: TFunction, categoryName: string, categoryDescription: string, articlesToMerge: string): string => {
    return t('prompts.knowledgeMerge.main', { categoryName, categoryDescription, articlesToMerge });
};
