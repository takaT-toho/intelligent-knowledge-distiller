import OpenAI from "openai";
import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult } from '../types';
import { LLMService } from './llmService';

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

const parseMarkdownResponse = (text: string): string => {
    let markdownStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = markdownStr.match(fenceRegex);
    if (match && match[2]) {
        markdownStr = match[2].trim();
    }
    return markdownStr;
};

export class OpenAIService implements LLMService {
    private client: OpenAI;
    private model: string;
    
    constructor(apiKey?: string, baseURL?: string, model?: string) {
        const resolvedApiKey = apiKey || process.env.OPENAI_API_KEY || "";
        let resolvedBaseURL = baseURL || "https://api.openai.com/v1";
        let defaultQuery: Record<string, any> | undefined = undefined;
        let resolvedModel = model || "gpt-4.1-nano";

        // If the user provides a URL with /chat/completions, strip it off
        // as the client library appends it automatically.
        if (resolvedBaseURL.includes('/chat/completions')) {
            resolvedBaseURL = resolvedBaseURL.substring(0, resolvedBaseURL.lastIndexOf('/chat/completions'));
        }

        const originalURL = resolvedBaseURL;

        // To avoid CORS issues, route all non-localhost http requests through the local proxy.
        if (resolvedBaseURL.startsWith('http') && !resolvedBaseURL.includes('localhost')) {
            resolvedBaseURL = `/proxy/${resolvedBaseURL}`;
        }
        
        // If baseURL is a relative path (for proxy), make it absolute by prepending the current origin.
        if (resolvedBaseURL.startsWith('/')) {
            resolvedBaseURL = `${window.location.origin}${resolvedBaseURL}`;
        }

        // Parse the original URL for Azure-specific details, but do not overwrite the proxied URL.
        if (originalURL.startsWith('http') && originalURL.includes('/openai/deployments/')) {
            try {
                const url = new URL(originalURL);
                const apiVersion = url.searchParams.get('api-version');
                if (apiVersion) {
                    defaultQuery = { 'api-version': apiVersion };
                }
                
                const pathParts = url.pathname.split('/');
                const deploymentIndex = pathParts.indexOf('deployments');
                if (deploymentIndex > -1 && pathParts.length > deploymentIndex + 1) {
                    let modelName = pathParts[deploymentIndex + 1];
                    // If the model name from URL ends with /chat/completions, remove it
                    if (modelName.endsWith('/chat/completions')) {
                        modelName = modelName.substring(0, modelName.lastIndexOf('/chat/completions'));
                    }
                    resolvedModel = modelName;
                }
            } catch (error) {
                console.error("Error parsing Azure-like URL. Falling back to default behavior.", error);
                defaultQuery = undefined;
                resolvedModel = model || "gpt-4.1-nano";
            }
        }

        this.client = new OpenAI({ 
            apiKey: resolvedApiKey,
            dangerouslyAllowBrowser: true,
            baseURL: resolvedBaseURL,
            defaultQuery: defaultQuery
        });
        this.model = resolvedModel;
    }

    private async generateContent(prompt: string, isJson: boolean, systemPrompt?: string): Promise<string> {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages,
            response_format: isJson ? { type: "json_object" } : { type: "text" },
        });
        return response.choices[0]?.message.content || "";
    }
    
    async discoverCategories(prompt: string, systemPrompt?: string): Promise<Category[]> {
        const content = await this.generateContent(prompt, true, systemPrompt);
        const parsed = parseJsonResponse<{ categories: Category[] }>(content);
        
        if (!parsed || !Array.isArray(parsed.categories)) {
            throw new Error("Failed to discover categories. The AI response was malformed.");
        }
        
        return parsed.categories;
    }
    
    async categorizeTickets(
        prompts: string[], 
        onProgress: (index: number) => void,
        systemPrompt?: string
    ): Promise<(CategorizedTicketResult[] | null)[]> {
        const promises = prompts.map(async (prompt, index) => {
            try {
                const content = await this.generateContent(prompt, true, systemPrompt);
                const parsed = parseJsonResponse<{ assignments: CategorizedTicketResult[] }>(content);
                
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
        const content = await this.generateContent(prompt, false, systemPrompt);
        return parseMarkdownResponse(content);
    }

    async discoverSubcategories(prompt: string, systemPrompt?: string): Promise<SubCategory[]> {
        const content = await this.generateContent(prompt, true, systemPrompt);
        const parsed = parseJsonResponse<{ subcategories: SubCategory[] }>(content);

        if (!parsed || !Array.isArray(parsed.subcategories)) {
            throw new Error("Failed to discover subcategories. The AI response was malformed.");
        }

        return parsed.subcategories;
    }

    async categorizeToSubcategories(
        prompts: string[],
        onProgress: (index: number) => void,
        systemPrompt?: string
    ): Promise<(SubCategorizedTicketResult[] | null)[]> {
        const promises = prompts.map(async (prompt, index) => {
            try {
                const content = await this.generateContent(prompt, true, systemPrompt);
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

    async optimizePrompt(prompt: string, domain: string, systemPrompt?: string): Promise<string> {
        const optimizationPrompt = `You are a prompt engineering expert. Your task is to refine the following prompt to be more effective for the specific domain of "${domain}".

# Original Prompt
${prompt}

# Task
Rewrite the prompt to be more specific, clear, and effective for the "${domain}" domain. Maintain the original JSON output format if one was requested. The revised prompt should guide the AI to produce more accurate and relevant results for this domain. Do not wrap the output in markdown or any other formatting. Just return the raw, optimized prompt.`;
        
        // The system prompt for optimization itself is the optimization prompt.
        return this.generateContent(optimizationPrompt, false, systemPrompt);
    }
}
