import { TFunction } from 'i18next';

export const DEFAULT_SEPARATOR = '--- TICKET BREAK ---';
export const SUBCATEGORY_THRESHOLD = 50;

export const getCategoryDiscoveryPrompt = (t: TFunction, domain: string, tickets: string[]): string => {
  return t('prompts.categoryDiscovery.main', { domain, tickets: tickets.join('\n\n') });
};

export const getTicketCategorizationPrompt = (t: TFunction, domain: string, title: string, description: string, categories: string): string => {
    return t('prompts.ticketCategorization.main', { domain, title, description, categories });
};

export const getKnowledgeSynthesisPrompt = (t: TFunction, domain: string, categoryName: string, categoryDescription: string, tickets: string[]): string => {
    return t('prompts.knowledgeSynthesis.main', { domain, categoryName, categoryDescription, tickets: tickets.join('\n\n---\n\n') });
};

export const getCategoryMergePrompt = (t: TFunction, domain: string, categorySetsJson: string): string => {
    return t('prompts.categoryMerge.main', { domain, categorySetsJson });
};

export const getSubcategoryDiscoveryPrompt = (t: TFunction, domain: string, parentCategoryName: string, parentCategoryDescription: string, sampleTickets: string): string => {
    return t('prompts.subcategoryDiscovery.main', { domain, parentCategoryName, parentCategoryDescription, sampleTickets });
};

export const getSubcategoryCategorizationPrompt = (t: TFunction, domain: string, title: string, description: string, parentCategoryName: string, parentCategoryDescription: string, subcategories: string): string => {
    return t('prompts.subcategoryCategorization.main', { domain, title, description, parentCategoryName, parentCategoryDescription, subcategories });
};

export const getKnowledgeMergePrompt = (t: TFunction, domain: string, categoryName: string, categoryDescription: string, articlesToMerge: string): string => {
    return t('prompts.knowledgeMerge.main', { domain, categoryName, categoryDescription, articlesToMerge });
};
