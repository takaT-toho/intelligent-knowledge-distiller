import { TFunction } from 'i18next';
import OpenAI from "openai";
import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult } from '../types';
import { LLMService } from './llmService';
import { 
    getCategoryDiscoveryPrompt, 
    getTicketCategorizationPrompt, 
    getKnowledgeSynthesisPrompt,
    getSubcategoryDiscoveryPrompt,
    getSubcategoryCategorizationPrompt
} from '../constants';

if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY environment variable not set. The application will not be able to connect to the OpenAI API.");
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

export class OpenAIService implements LLMService {
    private client: OpenAI;
    
    constructor(baseURL?: string) {
        this.client = new OpenAI({ 
            apiKey: process.env.OPENAI_API_KEY || "",
            dangerouslyAllowBrowser: true,
            baseURL: baseURL || "https://api.openai.com/v1"
        });
    }
    
    async discoverCategories(t: TFunction, tickets: string[]): Promise<Category[]> {
        // Use a sample of tickets to avoid overly large prompts
        const sampleSize = Math.min(tickets.length, 100);
        const ticketSample = tickets.slice(0, sampleSize);
        
        const prompt = getCategoryDiscoveryPrompt(t, ticketSample);
        
        const response = await this.client.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });
        
        const content = response.choices[0]?.message.content || "";
        const parsed = parseJsonResponse<{ categories: Category[] }>(content);
        
        if (!parsed || !Array.isArray(parsed.categories)) {
            throw new Error("Failed to discover categories. The AI response was malformed.");
        }
        
        return parsed.categories;
    }
    
    async categorizeTickets(
        t: TFunction,
        tickets: string[], 
        categories: Category[], 
        onProgress: (index: number) => void
    ): Promise<(CategorizedTicketResult[] | null)[]> {
        const categoryList = JSON.stringify(categories, null, 2);
        
        const promises = tickets.map(async (ticket, index) => {
            const [title, description] = ticket.split('\nDescription: ');
            try {
                const prompt = getTicketCategorizationPrompt(t, title.replace('Title: ', ''), description, categoryList);
                
                const response = await this.client.chat.completions.create({
                    model: "gpt-4.1-nano",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                });
                
                const content = response.choices[0]?.message.content || "";
                const parsed = parseJsonResponse<{ assignments: CategorizedTicketResult[] }>(content);
                
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
        t: TFunction,
        categoryName: string, 
        categoryDescription: string, 
        tickets: string[]
    ): Promise<string> {
        const prompt = getKnowledgeSynthesisPrompt(t, categoryName, categoryDescription, tickets);
        
        const response = await this.client.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [{ role: "user", content: prompt }]
        });
        
        return response.choices[0]?.message.content || "";
    }

    async discoverSubcategories(
        t: TFunction,
        parentCategoryName: string,
        parentCategoryDescription: string,
        tickets: string[]
    ): Promise<SubCategory[]> {
        const sampleSize = Math.min(tickets.length, 100);
        const ticketSample = tickets.slice(0, sampleSize).join('\n\n---\n\n');

        const prompt = getSubcategoryDiscoveryPrompt(t, parentCategoryName, parentCategoryDescription, ticketSample);

        const response = await this.client.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message.content || "";
        const parsed = parseJsonResponse<{ subcategories: SubCategory[] }>(content);

        if (!parsed || !Array.isArray(parsed.subcategories)) {
            throw new Error("Failed to discover subcategories. The AI response was malformed.");
        }

        return parsed.subcategories;
    }

    async categorizeToSubcategories(
        t: TFunction,
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
                    t,
                    title.replace('Title: ', ''),
                    description,
                    parentCategoryName,
                    parentCategoryDescription,
                    subcategoryList
                );

                const response = await this.client.chat.completions.create({
                    model: "gpt-4.1-nano",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                });

                const content = response.choices[0]?.message.content || "";
                const parsed = parseJsonResponse<{ assignments: SubCategorizedTicketResult[] }>(content);

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
