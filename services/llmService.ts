import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult, LLMProvider } from '../types';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openaiService';

export interface LLMService {
  discoverCategories(prompt: string, systemPrompt?: string): Promise<Category[]>;
  categorizeTickets(
    prompts: string[], 
    onProgress: (index: number) => void,
    systemPrompt?: string
  ): Promise<(CategorizedTicketResult[] | null)[]>;
  synthesizeKnowledge(
    prompt: string,
    systemPrompt?: string
  ): Promise<string>;
  discoverSubcategories(
    prompt: string,
    systemPrompt?: string
  ): Promise<SubCategory[]>;
  categorizeToSubcategories(
    prompts: string[],
    onProgress: (index: number) => void,
    systemPrompt?: string
  ): Promise<(SubCategorizedTicketResult[] | null)[]>;
  optimizePrompt(prompt: string, domain: string, systemPrompt?: string): Promise<string>;
}

export class LLMServiceFactory {
  static getService(provider: LLMProvider, config?: { apiKey?: string, baseURL?: string, model?: string }): LLMService {
    switch (provider) {
      case LLMProvider.GEMINI:
        return new GeminiService();
      case LLMProvider.OPENAI:
        return new OpenAIService(config?.apiKey, config?.baseURL, config?.model);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }
}
