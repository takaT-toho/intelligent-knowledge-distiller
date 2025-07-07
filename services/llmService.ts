import { TFunction } from 'i18next';
import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult, LLMProvider } from '../types';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openaiService';

export interface LLMService {
  discoverCategories(t: TFunction, tickets: string[]): Promise<Category[]>;
  categorizeTickets(
    t: TFunction,
    tickets: string[], 
    categories: Category[], 
    onProgress: (index: number) => void
  ): Promise<(CategorizedTicketResult[] | null)[]>;
  synthesizeKnowledge(
    t: TFunction,
    categoryName: string, 
    categoryDescription: string, 
    tickets: string[]
  ): Promise<string>;
  discoverSubcategories(
    t: TFunction,
    parentCategoryName: string,
    parentCategoryDescription: string,
    tickets: string[]
  ): Promise<SubCategory[]>;
  categorizeToSubcategories(
    t: TFunction,
    tickets: string[],
    parentCategoryName: string,
    parentCategoryDescription: string,
    subcategories: SubCategory[],
    onProgress: (index: number) => void
  ): Promise<(SubCategorizedTicketResult[] | null)[]>;
}

export class LLMServiceFactory {
  static getService(provider: LLMProvider, config?: { baseURL?: string}): LLMService {
    switch (provider) {
      case LLMProvider.GEMINI:
        return new GeminiService();
      case LLMProvider.OPENAI:
        return new OpenAIService(config?.baseURL);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }
}
