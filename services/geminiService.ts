
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { LLMProvider, Category, CategorizedTicketResult } from '../types';
import { getCategoryDiscoveryPrompt, getTicketCategorizationPrompt, getKnowledgeSynthesisPrompt } from '../constants';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. The application will not be able to connect to the Gemini API.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

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

export const discoverCategories = async (
    tickets: string[], 
    provider: LLMProvider
): Promise<Category[]> => {
    if (provider !== LLMProvider.GEMINI) throw new Error("Only Gemini provider is implemented.");

    // Use a sample of tickets to avoid overly large prompts
    const sampleSize = Math.min(tickets.length, 20);
    const ticketSample = tickets.slice(0, sampleSize);
    
    const prompt = getCategoryDiscoveryPrompt(ticketSample);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.2,
        }
    });

    const parsed = parseJsonResponse<{ categories: Category[] }>(response.text);
    if (!parsed || !Array.isArray(parsed.categories)) {
        throw new Error("Failed to discover categories. The AI response was malformed.");
    }
    return parsed.categories;
};

export const categorizeTickets = async (
    tickets: string[], 
    categories: Category[], 
    provider: LLMProvider,
    onProgress: (index: number) => void
): Promise<(CategorizedTicketResult[] | null)[]> => {
    if (provider !== LLMProvider.GEMINI) throw new Error("Only Gemini provider is implemented.");

    const categoryList = categories.map(c => `- ${c.name}: ${c.description}`).join('\n');
    
    const promises = tickets.map(async (ticket, index) => {
        try {
            const prompt = getTicketCategorizationPrompt(ticket, categoryList);
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.1,
                }
            });
            const parsed = parseJsonResponse<{ assignments: CategorizedTicketResult[] }>(response.text);
            onProgress(index);
            return parsed.assignments || null;
        } catch (e) {
            console.error(`Error categorizing ticket ${index}:`, e);
            onProgress(index);
            return null; // Return null on error for this specific ticket
        }
    });

    return Promise.all(promises);
};

export const synthesizeKnowledge = async (
    categoryName: string, 
    categoryDescription: string, 
    tickets: string[], 
    provider: LLMProvider
): Promise<string> => {
    if (provider !== LLMProvider.GEMINI) throw new Error("Only Gemini provider is implemented.");

    const prompt = getKnowledgeSynthesisPrompt(categoryName, categoryDescription, tickets);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: {
            temperature: 0.5,
        }
    });
    
    return response.text;
};
