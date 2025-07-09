import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult, LLMProvider } from '../types';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openaiService';

export interface LLMService {
  discoverCategories(prompt: string): Promise<Category[]>;
  categorizeTickets(
    prompts: string[], 
    onProgress: (index: number) => void
  ): Promise<(CategorizedTicketResult[] | null)[]>;
  synthesizeKnowledge(
    prompt: string
  ): Promise<string>;
  discoverSubcategories(
    prompt: string
  ): Promise<SubCategory[]>;
  categorizeToSubcategories(
    prompts: string[],
    onProgress: (index: number) => void
  ): Promise<(SubCategorizedTicketResult[] | null)[]>;
  optimizePrompt(prompt: string, domain: string): Promise<string>;
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
