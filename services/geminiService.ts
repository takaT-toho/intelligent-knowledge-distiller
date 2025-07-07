import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult } from '../types';
import { LLMService } from './llmService';
import { 
    getCategoryDiscoveryPrompt, 
    getTicketCategorizationPrompt, 
    getKnowledgeSynthesisPrompt,
    getSubcategoryDiscoveryPrompt,
    getSubcategoryCategorizationPrompt
} from '../constants';

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

    async discoverCategories(tickets: string[]): Promise<Category[]> {
        // Use a sample of tickets to avoid overly large prompts
        const sampleSize = Math.min(tickets.length, 100);
        const ticketSample = tickets.slice(0, sampleSize);
        
        const prompt = getCategoryDiscoveryPrompt(ticketSample);
        
        const response: GenerateContentResponse = await this.client.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
            }
        });

        const text = response.text || '';
        const parsed = parseJsonResponse<{ categories: Category[] }>(text);
        if (!parsed || !Array.isArray(parsed.categories)) {
            throw new Error("Failed to discover categories. The AI response was malformed.");
        }
        return parsed.categories;
    }

    async categorizeTickets(
        tickets: string[], 
        categories: Category[], 
        onProgress: (index: number) => void
    ): Promise<(CategorizedTicketResult[] | null)[]> {
        const categoryList = JSON.stringify(categories, null, 2);
        
        const promises = tickets.map(async (ticket, index) => {
            const [title, description] = ticket.split('\nDescription: ');
            try {
                const prompt = getTicketCategorizationPrompt(title.replace('Title: ', ''), description, categoryList);
                const response: GenerateContentResponse = await this.client.models.generateContent({
                    model: 'gemini-2.5-flash-preview-04-17',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        temperature: 0.1,
                    }
                });
                const text = response.text || '';
                const parsed = parseJsonResponse<{ assignments: CategorizedTicketResult[] }>(text);
                onProgress(index);
                return parsed.assignments || null;
            } catch (e) {
                console.error(`Error categorizing ticket ${index}:`, e);
                onProgress(index);
                return null; // Return null on error for this specific ticket
            }
        });

        return Promise.all(promises);
    }

    async synthesizeKnowledge(
        categoryName: string, 
        categoryDescription: string, 
        tickets: string[]
    ): Promise<string> {
        const prompt = getKnowledgeSynthesisPrompt(categoryName, categoryDescription, tickets);
        
        const response: GenerateContentResponse = await this.client.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
            config: {
                temperature: 0.5,
            }
        });
        
        return response.text || '';
    }

    async discoverSubcategories(
        parentCategoryName: string,
        parentCategoryDescription: string,
        tickets: string[]
    ): Promise<SubCategory[]> {
        const sampleSize = Math.min(tickets.length, 100);
        const ticketSample = tickets.slice(0, sampleSize).join('\n\n---\n\n');

        const prompt = getSubcategoryDiscoveryPrompt(parentCategoryName, parentCategoryDescription, ticketSample);

        const response: GenerateContentResponse = await this.client.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
            }
        });

        const text = response.text || '';
        const parsed = parseJsonResponse<{ subcategories: SubCategory[] }>(text);
        if (!parsed || !Array.isArray(parsed.subcategories)) {
            throw new Error("Failed to discover subcategories. The AI response was malformed.");
        }
        return parsed.subcategories;
    }

    async categorizeToSubcategories(
        tickets: string[],
        parentCategoryName: string,
        parentCategoryDescription: string,
        subcategories: SubCategory[],
        onProgress: (index: number) => void
    ): Promise<(SubCategorizedTicketResult[] | null)[]> {
        const subcategoryList = JSON.stringify(subcategories, null, 2);

        const promises = tickets.map(async (ticket, index) => {
            const [title, description] = ticket.split('\nDescription: ');
            try {
                const prompt = getSubcategoryCategorizationPrompt(
                    title.replace('Title: ', ''),
                    description,
                    parentCategoryName,
                    parentCategoryDescription,
                    subcategoryList
                );
                const response: GenerateContentResponse = await this.client.models.generateContent({
                    model: 'gemini-2.5-flash-preview-04-17',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        temperature: 0.1,
                    }
                });
                const text = response.text || '';
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
}
