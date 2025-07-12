# Intelligent Knowledge Distiller

This project is an implementation of the multi-agent knowledge base construction system proposed in the research paper **"From Unstructured Communication to Intelligent RAG: Multi-Agent Automation for Supply Chain Knowledge Bases"** ([arXiv:2506.17484](https://arxiv.org/abs/2506.17484)).

It transforms unstructured text data, such as support tickets, into a structured and summarized knowledge base using Large Language Models (LLMs). The application provides a user interface to control the process and supports both Gemini and OpenAI models.

## Features

-   **Automated Knowledge Base Construction**: Converts raw text into categorized and summarized knowledge articles.
-   **Dynamic Categorization**: Automatically discovers categories and subcategories from the data.
-   **Hierarchical Processing**: For categories with a large number of items, it creates subcategories for deeper analysis, preventing loss of detail.
-   **LLM Flexibility**: Supports both Google's Gemini and OpenAI's models.
-   **Customizable Processing**:
    -   **Domain Specification**: Users can specify a business domain (e.g., "Supply Chain") to tailor the AI's understanding.
    -   **Processing Modes**:
        -   **Simple Mode**: Uses predefined prompts for processing.
        -   **Dynamic Mode**: Optimizes prompts based on the specified domain to aim for higher quality results.
-   **Multilingual Support**: The user interface is available in both Japanese and English.
-   **Flexible Endpoint Configuration**: Allows flexible configuration of API key, base URL, and model name (deployment name) from the UI to support OpenAI and compatible APIs like Azure OpenAI (AOAI).

## Architecture Overview

This application is structured as a simple, unified Node.js application.

-   **Frontend**: A modern UI built with React, TypeScript, and Vite.
-   **Backend**: A lightweight Node.js server (`server.js`) built with Express. This server has two key roles:
    1.  **Web Server**: Serves the static files (HTML, CSS, JS) of the built React application.
    2.  **API Proxy**: Securely relays API requests to prevent CORS (Cross-Origin Resource Sharing) errors that occur when browsers make direct requests to external APIs like Azure OpenAI.

This integrated setup ensures both local development and production deployment are simple and robust.

## Settings

Click the gear icon (⚙️) in the upper right corner to open the settings modal.

### AI Model Provider

Select the LLM provider to use.

-   **GEMINI**: Uses Google's Gemini models. The API key must be set in your `.env` file.
    -   **Changing Models**: The Gemini model is currently hardcoded. To change it, edit the `model` value in the `generateContent` method within `services/geminiService.ts`.
-   **OPENAI**: Uses OpenAI's models or a compatible API (like Azure OpenAI).

### OpenAI / Azure OpenAI (AOAI) Settings

When `OPENAI` is selected, you can configure the following:

-   **OpenAI API Key**: Enter your API key. This takes precedence over any key set in environment variables.
-   **OpenAI API Base URL**: Specify the API endpoint URL. For Azure OpenAI, you can paste the full endpoint URL directly.
-   **OpenAI Model (Optional)**: Specify the model name. For Azure OpenAI, this is your **deployment name**.

## Local Development

**Prerequisites:** Node.js

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env.local` file in the root directory and set your API keys.
    ```
    # Required for Gemini
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

    # Required for OpenAI if not set in the UI
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    ```
    **Note**: The OpenAI API key can also be entered directly in the UI settings, which will override the `.env.local` file.
4.  Run the development server:
    ```bash
    npm run dev
    ```
    This command starts the Vite development server (providing hot-reloading) and the Node.js server for API proxying concurrently.
5.  Open `http://localhost:5173` in your browser.

## Deployment to Cloud Run

See `docs/DEPLOY_TO_GCR.md` for details.
