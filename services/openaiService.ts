import OpenAI from "openai";
import { Category, SubCategory, CategorizedTicketResult, SubCategorizedTicketResult } from '../types';
import { LLMService } from './llmService';

const PROXY_SERVER_URL = 'http://localhost:3001';
const DEFAULT_OPENAI_URL = "https://api.openai.com/v1";

const parseJsonResponse = <T,>(text: string): T => {
    if (typeof text !== 'string') {
        text = JSON.stringify(text);
    }
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
    private apiKey: string;
    private baseURL: string;
    private model: string;
    private useProxy: boolean;
    private standardClient: OpenAI;

    constructor(apiKey?: string, baseURL?: string, model?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
        this.baseURL = baseURL || DEFAULT_OPENAI_URL;
        this.model = model || "gpt-4.1-nano";
        
        // Use the proxy for any URL that is not the default OpenAI URL.
        this.useProxy = this.baseURL !== DEFAULT_OPENAI_URL;

        // The standard client is used ONLY for the default OpenAI URL.
        this.standardClient = new OpenAI({
            apiKey: this.apiKey,
            dangerouslyAllowBrowser: true,
            baseURL: DEFAULT_OPENAI_URL,
        });
        
        // If it's a custom URL (likely Azure), parse the deployment name to use as the model.
        if (this.useProxy) {
            try {
                const url = new URL(this.baseURL);
                if (url.pathname.includes('/openai/deployments/')) {
                    const pathParts = url.pathname.split('/');
                    const deploymentIndex = pathParts.indexOf('deployments');
                    if (deploymentIndex > -1 && pathParts.length > deploymentIndex + 1) {
                        this.model = pathParts[deploymentIndex + 1];
                    }
                }
            } catch (e) { 
                console.error("Could not parse custom URL to extract deployment name:", e);
            }
        }
    }

    private async generateContent(prompt: string, isJson: boolean, systemPrompt?: string): Promise<string> {
        const messages: { role: string; content: string }[] = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        if (this.useProxy) {
            // Use the backend proxy for all custom URLs to handle CORS.
            const body = {
                baseURL: this.baseURL,
                apiKey: this.apiKey,
                model: this.model,
                messages,
                response_format: isJson ? { type: "json_object" } : { type: "text" },
            };

            const response = await fetch(`${PROXY_SERVER_URL}/api/openai/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ details: response.statusText }));
                console.error('Error from proxy server:', errorData);
                throw new Error(`API request failed via proxy with status ${response.status}: ${errorData.details || errorData.error}`);
            }

            const responseData = await response.json();
            return responseData.choices[0]?.message?.content || "";
        } else {
            // Use the standard OpenAI client directly for the default URL.
            const response = await this.standardClient.chat.completions.create({
                model: this.model,
                messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
                response_format: isJson ? { type: "json_object" } : { type: "text" },
            });
            return response.choices[0]?.message.content || "";
        }
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
        
        return this.generateContent(optimizationPrompt, false, systemPrompt);
    }
}
