/**
 * Rich description for the web_search tool.
 * Used in the system prompt to guide the LLM on when and how to use this tool.
 */
export const WEB_SEARCH_DESCRIPTION = `
Search the web for current information on any topic. Returns relevant search results with URLs and content snippets.

## When to Use

- Factual questions about entities (companies, people, organizations) where status can change
- Current events, breaking news, recent developments
- Technology updates, product announcements, industry trends
- Verifying claims about real-world state (public/private, active/defunct, current leadership)
- Research on any topic requiring up-to-date information

## When NOT to Use

- Pure conceptual/definitional questions that don't require current data

## Usage Notes

- Provide specific, well-formed search queries for best results
- Returns up to 5 results with URLs and content snippets
`.trim();
