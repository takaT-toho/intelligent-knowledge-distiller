
export enum LLMProvider {
  GEMINI = 'Gemini',
  OPENAI = 'OpenAI (Not Implemented)',
}

export interface Category {
  name: string;
  description: string;
  identifying_patterns: string[];
}

export interface CategorizedTicketResult {
  category: string;
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
