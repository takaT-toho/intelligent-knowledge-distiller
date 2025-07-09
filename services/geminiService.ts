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

const parseMarkdownResponse = (text: string): string => {
    let markdownStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = markdownStr.match(fenceRegex);
    if (match && match[2]) {
        markdownStr = match[2].trim();
    }
    return markdownStr;
};

export class GeminiService implements LLMService {
    private client: GoogleGenAI;

    constructor() {
        this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    }

    private async generateContent(prompt: string, isJson: boolean, systemPrompt?: string): Promise<string> {
        const response: GenerateContentResponse = await this.client.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
            config: {
                responseMimeType: isJson ? "application/json" : "text/plain",
                temperature: isJson ? 0.2 : 0.5,
                systemInstruction: systemPrompt ? systemPrompt : undefined,
            }
        });
        return response.text || '';
    }

    async discoverCategories(prompt: string, systemPrompt?: string): Promise<Category[]> {
        const text = await this.generateContent(prompt, true, systemPrompt);
        const parsed = parseJsonResponse<{ categories: Category[] }>(text);
        if (!parsed || !Array.isArray(parsed.categories)) {
            throw new Error("Failed to discover categories. The AI response was malformed.");
        }
        return parsed.categories;
    }

    async categorizeTickets(prompts: string[], onProgress: (index: number) => void, systemPrompt?: string): Promise<(CategorizedTicketResult[] | null)[]> {
        const promises = prompts.map(async (prompt, index) => {
            try {
                const text = await this.generateContent(prompt, true, systemPrompt);
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

    async synthesizeKnowledge(prompt: string, systemPrompt?: string): Promise<string> {
        const text = await this.generateContent(prompt, false, systemPrompt);
        return parseMarkdownResponse(text);
    }

    async discoverSubcategories(prompt: string, systemPrompt?: string): Promise<SubCategory[]> {
        const text = await this.generateContent(prompt, true, systemPrompt);
        const parsed = parseJsonResponse<{ subcategories: SubCategory[] }>(text);
        if (!parsed || !Array.isArray(parsed.subcategories)) {
            throw new Error("Failed to discover subcategories. The AI response was malformed.");
        }
        return parsed.subcategories;
    }

    async categorizeToSubcategories(prompts: string[], onProgress: (index: number) => void, systemPrompt?: string): Promise<(SubCategorizedTicketResult[] | null)[]> {
        const promises = prompts.map(async (prompt, index) => {
            try {
                const text = await this.generateContent(prompt, true, systemPrompt);
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

    async optimizePrompt(prompt: string, domain: string, systemPrompt?: string): Promise<string> {
        const optimizationPrompt = `You are a prompt engineering expert. Your task is to refine the following prompt to be more effective for the specific domain of "${domain}".

# Original Prompt
${prompt}

# Task
Rewrite the prompt to be more specific, clear, and effective for the "${domain}" domain. Maintain the original JSON output format if one was requested. The revised prompt should guide the AI to produce more accurate and relevant results for this domain. Do not wrap the output in markdown or any other formatting. Just return the raw, optimized prompt.`;
        
        return this.generateContent(optimizationPrompt, false, systemPrompt);
    }
}
