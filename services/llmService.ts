import { Category, CategorizedTicketResult, LLMProvider } from '../types';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openaiService';

export interface LLMService {
  discoverCategories(tickets: string[]): Promise<Category[]>;
  categorizeTickets(
    tickets: string[], 
    categories: Category[], 
    onProgress: (index: number) => void
  ): Promise<(CategorizedTicketResult[] | null)[]>;
  synthesizeKnowledge(
    categoryName: string, 
    categoryDescription: string, 
    tickets: string[]
  ): Promise<string>;
}

export class LLMServiceFactory {
  static getService(provider: LLMProvider): LLMService {
    switch (provider) {
      case LLMProvider.GEMINI:
        return new GeminiService();
      case LLMProvider.OPENAI:
        return new OpenAIService();
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }
}
