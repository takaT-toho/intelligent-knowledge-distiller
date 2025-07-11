# Intelligent Knowledge Distiller

This project is an implementation of the multi-agent knowledge base creation system proposed in the research paper: **"From Unstructured Communication to Intelligent RAG: Multi-Agent Automation for Supply Chain Knowledge Bases"** ([arXiv:2506.17484](https://arxiv.org/abs/2506.17484)).

It transforms unstructured text data, such as support tickets, into a structured and synthesized knowledge base using Large Language Models (LLMs). This application provides a user interface to control the process, supporting both Gemini and OpenAI models.

## Features

- **Automated Knowledge Base Creation**: Transforms raw text into categorized, synthesized knowledge articles.
- **Dynamic Categorization**: Discovers categories and subcategories from the data automatically.
- **Hierarchical Processing**: For categories with a large number of items, it performs a deeper analysis by creating and processing subcategories, preventing loss of detail.
- **LLM Flexibility**: Supports both Google's Gemini and OpenAI's models.
- **Customizable Processing**:
    - **Domain Specification**: Users can specify the business domain (e.g., "Supply Chain") to tailor the AI's understanding.
    - **Processing Modes**:
        - **Simple Mode**: Uses predefined prompts for processing.
        - **Dynamic Mode**: Optimizes prompts based on the specified domain for potentially higher quality results.
- **Multi-language Support**: The user interface is available in both English and Japanese.
- **Flexible Endpoint Configuration**: Supports compatible APIs like Azure OpenAI (AOAI) by allowing flexible configuration of the API Key, Base URL, and Model Name (Deployment Name) directly from the UI.

## Configuration

Click the gear icon in the top-right corner to open the settings modal.

### AI Model Provider

Select the LLM provider you want to use.

- **GEMINI**: Uses Google's Gemini models. The API key must be set in the `.env` file.
- **OPENAI**: Uses OpenAI's models or a compatible API (like Azure OpenAI).

### OpenAI / Azure OpenAI (AOAI) Settings

When you select `OPENAI` as the provider, the following fields become available:

- **OpenAI API Key**:
  - Enter your API key.
  - The key entered here will take precedence over the key set in your environment variables (`.env.local` file).
  - If left blank, the application will use the `OPENAI_API_KEY` from your environment variables.

- **OpenAI API Base URL**:
  - Specify the API endpoint URL.
  - **For Azure OpenAI (AOAI)**: You can paste the full endpoint URL directly. The application will automatically handle it.
    - Example: `https://example-aoai.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT_ID/chat/completions?api-version=2024-02-01`

- **OpenAI Model (Optional)**:
  - Specify the model name.
  - **For Azure OpenAI (AOAI)**: Enter your **Deployment Name** here (e.g., `gpt-4.1-nano`).
  - If left blank, or if the model cannot be automatically extracted from the URL, a default model will be used.

**Note on CORS**: Any CORS (Cross-Origin Resource Sharing) errors that occur when using external APIs during local development are automatically handled by a built-in proxy. You do not need to perform any special configuration.

## Architecture and Processing Flow

The system employs an "offline-first" approach to enhance Retrieval-Augmented Generation (RAG). It pre-builds a high-quality, condensed knowledge base through a pipeline of specialized AI agents, rather than performing complex processing at query time.

### Agent Roles

1.  **Category Discovery Agent**: Analyzes raw data to identify and create a taxonomy of knowledge categories.
2.  **Ticket Categorization Agent**: Assigns each ticket to the most relevant category.
3.  **Knowledge Synthesis Agent**: Aggregates all tickets within a category (or subcategory) and generates a concise, actionable knowledge article.

### Hierarchical Processing for Large Categories

A key feature is its ability to handle large categories. When the number of tickets in a category exceeds a threshold (`SUBCATEGORY_THRESHOLD`), the system dynamically switches to a more detailed, hierarchical processing flow:

1.  **Subcategory Discovery**: A specialized agent re-analyzes the tickets within the large category to find more granular subcategories.
2.  **Subcategory Categorization**: Tickets are then classified into these new subcategories.
3.  **Synthesize per Subcategory**: Knowledge articles are generated for each subcategory, resulting in more focused and specific insights.

This dynamic logic is orchestrated within the `handleProcess` function in `App.tsx`.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **LLM Integration**: `@google/genai`, `openai`
- **Internationalization**: `i18next`, `react-i18next`

## Key Code Locations

| Feature | Location | Description |
| :--- | :--- | :--- |
| **Core Prompts** | `constants.ts` | Contains all the prompt templates used by the AI agents. |
| **Orchestration Logic** | `App.tsx` | The main `handleProcess` function controls the state and flow of the entire pipeline. |
| **LLM Services** | `services/` | `llmService.ts` defines the interface, with `geminiService.ts` and `openaiService.ts` providing the concrete implementations. |
| **Type Definitions** | `types.ts` | Defines the core data structures like `Category`, `KnowledgeArticle`, etc. |
| **UI Components** | `components/` | Contains all React components for the user interface. |
| **Localization** | `public/locales/` | Contains JSON files for English and Japanese translations. |

## Run Locally

**Prerequisites:** Node.js

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env.local` file in the root directory by copying `.env.example` (if it exists) or creating it from scratch. Then, set your API keys as needed.
    ```
    # Required if using Gemini
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

    # Used for OpenAI if not set in the UI
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    ```
    **Note**: The OpenAI API key can also be entered directly in the settings UI. The key provided in the UI will override the one in the `.env.local` file.
4.  Run the development server:
    ```bash
    npm run dev
    ```
5.  Open your browser and navigate to the local URL provided (usually `http://localhost:5173`).
