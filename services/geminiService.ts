import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { LLMService } from './llmService';
import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult } from '../types';

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY environment variable not set. The application will not be able to connect to the Gemini API.");
}

const parseJsonResponse = <T,>(text: string): T => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("The AI returned a response that was not valid JSON. Please try again.");
    }
};

export class GeminiService implements LLMService {
    private client: GoogleGenAI;

    constructor() {
        this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    }

    private async generateContent(prompt: string, isJson: boolean): Promise<string> {
        const response: GenerateContentResponse = await this.client.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
            config: {
                responseMimeType: isJson ? "application/json" : "text/plain",
                temperature: isJson ? 0.2 : 0.5,
            }
        });
        return response.text || '';
    }

    async discoverCategories(prompt: string): Promise<Category[]> {
        const text = await this.generateContent(prompt, true);
        const parsed = parseJsonResponse<{ categories: Category[] }>(text);
        if (!parsed || !Array.isArray(parsed.categories)) {
            throw new Error("Failed to discover categories. The AI response was malformed.");
        }
        return parsed.categories;
    }

    async categorizeTickets(prompts: string[], onProgress: (index: number) => void): Promise<(CategorizedTicketResult[] | null)[]> {
        const promises = prompts.map(async (prompt, index) => {
            try {
                const text = await this.generateContent(prompt, true);
                const parsed = parseJsonResponse<{ assignments: CategorizedTicketResult[] }>(text);
                onProgress(index);
                return parsed.assignments || null;
            } catch (e) {
                console.error(`Error categorizing ticket ${index}:`, e);
                onProgress(index);
                return null;
            }
        });
        return Promise.all(promises);
    }

    async synthesizeKnowledge(prompt: string): Promise<string> {
        return this.generateContent(prompt, false);
    }

    async discoverSubcategories(prompt: string): Promise<SubCategory[]> {
        const text = await this.generateContent(prompt, true);
        const parsed = parseJsonResponse<{ subcategories: SubCategory[] }>(text);
        if (!parsed || !Array.isArray(parsed.subcategories)) {
            throw new Error("Failed to discover subcategories. The AI response was malformed.");
        }
        return parsed.subcategories;
    }

    async categorizeToSubcategories(prompts: string[], onProgress: (index: number) => void): Promise<(SubCategorizedTicketResult[] | null)[]> {
        const promises = prompts.map(async (prompt, index) => {
            try {
                const text = await this.generateContent(prompt, true);
                const parsed = parseJsonResponse<{ assignments: SubCategorizedTicketResult[] }>(text);
                onProgress(index);
                return parsed.assignments || null;
            } catch (e) {
                console.error(`Error categorizing ticket ${index} into subcategory:`, e);
                onProgress(index);
                return null;
            }
        });
        return Promise.all(promises);
    }

    async optimizePrompt(prompt: string, domain: string): Promise<string> {
        const optimizationPrompt = `You are a prompt engineering expert. Your task is to refine the following prompt to be more effective for the specific domain of "${domain}".

# Original Prompt
${prompt}

# Task
Rewrite the prompt to be more specific, clear, and effective for the "${domain}" domain. Maintain the original JSON output format if one was requested. The revised prompt should guide the AI to produce more accurate and relevant results for this domain. Do not wrap the output in markdown or any other formatting. Just return the raw, optimized prompt.`;
        
        return this.generateContent(optimizationPrompt, false);
    }
}
