# Intelligent Knowledge Distiller

This project is an implementation of the multi-agent knowledge base creation system proposed in the research paper: **"From Unstructured Communication to Intelligent RAG: Multi-Agent Automation for Supply Chain Knowledge Bases"** ([arXiv:2506.17484](https://arxiv.org/abs/2506.17484)).

It transforms unstructured text data, such as support tickets, into a structured and synthesized knowledge base.

## Architecture and Processing Flow

The core of this system is an "offline-first" approach to enhance Retrieval-Augmented Generation (RAG). Instead of performing complex processing at query time, it pre-builds a high-quality, condensed knowledge base. This is achieved through a pipeline of specialized AI agents.

### Agent Roles

1.  **Category Discovery Agent**: Analyzes raw ticket data to identify and create a taxonomy of knowledge categories.
2.  **Ticket Categorization Agent**: Assigns each ticket to the most relevant category.
3.  **Knowledge Synthesis Agent**: Aggregates all tickets within a category and generates a concise, actionable knowledge article summarizing the key issues and solutions.

### Hierarchical Processing for Large Categories

A key feature of this implementation is its ability to handle categories containing a large number of tickets, ensuring detailed knowledge is not lost.

-   When the number of tickets in a category exceeds a defined threshold (`SUBCATEGORY_THRESHOLD`), the system dynamically switches to a more detailed, hierarchical processing flow.
-   **Subcategory Discovery**: A specialized agent re-analyzes the tickets within the large category to find more granular subcategories.
-   **Subcategory Categorization**: Tickets are then classified into these new subcategories.
-   **Synthesize per Subcategory**: Knowledge articles are generated for each subcategory, resulting in more focused and specific insights.

This dynamic logic is orchestrated within the `handleProcess` function in `App.tsx`.

## Implementation Details

| Feature | Location | Description |
| :--- | :--- | :--- |
| **Core Prompts** | `constants.ts` | Contains all the prompt templates used by the AI agents. |
| **Orchestration Logic** | `App.tsx` | The main `handleProcess` function controls the state and flow of the entire pipeline. |
| **LLM Services** | `services/` | `llmService.ts` defines the interface, with `geminiService.ts` and `openaiService.ts` providing the concrete implementations. |
| **Type Definitions** | `types.ts` | Defines the core data structures like `Category`, `SubCategory`, etc. |

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  Create a `.env.local` file in the root directory and set your API keys:
    ```
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    ```
3.  Run the app:
    `npm run dev`
