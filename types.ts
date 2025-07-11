
export enum LLMProvider {
  GEMINI = 'Gemini',
  OPENAI = 'OpenAI',
}

export interface Category {
  name: string;
  description: string;
  identifying_patterns: string[];
}

export interface SubCategory extends Category {
  parent_category: string;
}

export interface CategorizedTicketResult {
  category: string;
  reasoning: string;
}

export interface SubCategorizedTicketResult {
  subcategory: string;
  reasoning: string;
}

export interface KnowledgeArticle {
  categoryName: string;
  markdownContent: string;
}

export enum ProcessingState {
  IDLE = 'IDLE',
  DISCOVERING = 'DISCOVERING',
  CATEGORIZING = 'CATEGORIZING',
  SYNTHESIZING = 'SYNTHESIZING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export enum ProcessingMode {
  SIMPLE = 'simple',
  DYNAMIC = 'dynamic',
}