
export const DEFAULT_SEPARATOR = '--- TICKET BREAK ---';

export const DEFAULT_RAW_TEXT = `Title: Cannot access shared drive
Description: I'm trying to access the Q3-Financials shared drive but I keep getting an access denied error. My username is jdoe. I had access yesterday.

--- TICKET BREAK ---

Title: Login issue on warehouse terminal
Description: The terminal at loading bay 4 is not letting me log in. It says 'Invalid Credentials'. I've tried resetting my password but it didn't help. My colleague was able to log in fine.

--- TICKET BREAK ---

Title: Need access to Marketing folder
Description: Hi team, can you please grant me read/write access to the new '2025_Campaign_Assets' folder in the marketing drive? My manager, Jane Smith, has approved this.

--- TICKET BREAK ---

Title: Password expired
Description: My password expired and the reset link isn't working. It just goes to a blank page. I need to get into the system ASAP. User ID: mchen`;

export const getCategoryDiscoveryPrompt = (tickets: string[]): string => `
You are analyzing ticket data from a supply chain management system. Your task is to discover knowledge categories based STRICTLY on the provided sample tickets.

# Sample Tickets
${tickets.join('\n\n')}

# Task
Create a taxonomy of knowledge categories based ONLY on these sample tickets.

For each category:
1. Provide a clear, concise name to capture the essence of the issue type (5 words or less).
2. Write a brief description of what this category encompasses (50 words or less).
3. List identifying patterns or keywords (maximum 15 per category).

# Important Guidelines
1. Focus ONLY on categories that are ACTUALLY REPRESENTED in the sample tickets.
2. Categories should be based on the nature of the problem, not just surface details.
3. Categories should be distinct from each other with minimal overlap.
4. The number of categories should reflect the diversity in the sample. DO NOT create more categories than justified by the samples.
5. Be extremely concise with category names and description, and use short keywords for identifying patterns.
6. DO NOT create categories for general organizational content that isn’t an actual problem.
7. DO NOT use your general knowledge about supply chain systems to invent categories, rely ONLY on what's in the data.

# Output Format
Return a JSON structure:

{
  "categories": [
    {
      "name": "Short Category Name",
      "description": "Brief description",
      "identifying_patterns": ["pattern1", "pattern2", "pattern3"]
    }
  ]
}
Ensure your JSON is properly formatted and valid. Be extremely concise with all text to minimize token usage.
`;

export const getTicketCategorizationPrompt = (ticket: string, categories: string): string => `
You are categorizing a supply chain ticket into predefined knowledge categories.

# Ticket Information
Title: ${ticket}
Description: ${description}

# Available Categories
${categories}

# Task
Assign this ticket to the most appropriate category from the list. 
If the ticket clearly fits multiple categories, you may assign it to up to 2 categories.

# Output Format
Return a JSON structure:

{
  "assignments": [
    {
      "category": "Category Name",
      "reasoning": "Brief explanation of why this category fits"
    }
  ]
}

If no categories are clearly applicable, return an empty assignments array.
`;

export const getKnowledgeSynthesisPrompt = (categoryName: string, categoryDescription: string, tickets: string[]): string => `
You are synthesizing knowledge from supply chain tickets to create a concise, factual knowledge base article specifically for users who create tickets in this system.

# Category Information
Name: ${categoryName}
Description: ${categoryDescription}

# Tickets in this Category
${tickets.join('\n\n---\n\n')}

# Task
Create a CONCISE knowledge article that contains ONLY information directly supported by the ticket data.

# Important Requirements
1. Use ONLY information explicitly mentioned in the ticket data.
2. DO NOT expand acronyms unless they are expanded in the tickets themselves.
3. DO NOT make up definitions for systems if not provided in the data.
4. DO NOT invent processes or best practices not mentioned in tickets.
5. Keep the article SHORT and FOCUSED - aim for 50% less content than you might typically write.
6. Write in a direct style addressing ticket creators.

# Focus on
1. Common issues seen in these tickets (briefly).
2. Actual solutions that worked (from ticket resolutions).
3. Minimal, specific advice based only on ticket content.

# Output Format
Your response should be a concise markdown document with:

1. Title: A brief descriptive title for the category "${categoryName}".
2. Common Issues: 2-3 bullet points of the main issues (be brief).
3. Tips for Resolution: Specific advice based ONLY on what worked in the tickets.
4. Resources: Only mention systems/links that appear in the tickets, if any.

Total length should be no more than 400-500 words maximum.
Your entire response must be a single markdown document. Do not wrap it in JSON or other structures.
`;
