# Repository Guidelines

- Carlo is a CLI-based AI chatbot assistant, built with TypeScript, Ink (React for CLI), and LangChain.

## Project Structure

- Source code: `src/`
  - Agent core: `src/agent/` (agent loop, prompts, scratchpad, token counting, types)
  - CLI interface: `src/cli.tsx` (Ink/React), entry point: `src/index.tsx`
  - Components: `src/components/` (Ink UI components)
  - Hooks: `src/hooks/` (React hooks for agent runner, model selection, input history)
  - Model/LLM: `src/model/llm.ts` (multi-provider LLM abstraction)
  - Tools: `src/tools/` (web search, browser, web fetch)
  - Tool descriptions: `src/tools/descriptions/` (rich descriptions injected into system prompt)
  - Search tools: `src/tools/search/` (Exa preferred, Perplexity, Tavily fallback)
  - Browser: `src/tools/browser/` (Playwright-based web scraping)
  - Utils: `src/utils/` (env, config, caching, token estimation, markdown tables)
- Config: `.carlo/settings.json` (persisted model/provider selection)
- Environment: `.env` (API keys; see `env.example`)
- Scripts: `scripts/release.sh`

## Build, Test, and Development Commands

- Runtime: Bun (primary). Use `bun` for all commands.
- Install deps: `bun install`
- Run: `bun run start` or `bun run src/index.tsx`
- Dev (watch mode): `bun run dev`
- Type-check: `bun run typecheck`
- Tests: `bun test`
- CI runs `bun run typecheck` and `bun test` on push/PR.

## Coding Style & Conventions

- Language: TypeScript (ESM, strict mode). JSX via React (Ink for CLI rendering).
- Prefer strict typing; avoid `any`.
- Keep files concise; extract helpers rather than duplicating code.
- Add brief comments for tricky or non-obvious logic.
- Do not add logging unless explicitly asked.
- Do not create README or documentation files unless explicitly asked.

## LLM Providers

- Supported: OpenAI (default), Anthropic, Google, xAI (Grok), OpenRouter, Ollama (local).
- Default model: `gpt-5.2`. Provider detection is prefix-based (`claude-` -> Anthropic, `gemini-` -> Google, etc.).
- Fast models for lightweight tasks: see `FAST_MODELS` map in `src/model/llm.ts`.
- Anthropic uses explicit `cache_control` on system prompt for prompt caching cost savings.
- Users switch providers/models via `/model` command in the CLI.

## Tools

- `web_search`: general web search (Exa if `EXASEARCH_API_KEY` set, Perplexity if `PERPLEXITY_API_KEY` set, else Tavily if `TAVILY_API_KEY` set).
- `web_fetch`: fetch and extract readable content from URLs.
- `browser`: Playwright-based web scraping for reading pages the agent discovers.
- Tool registry: `src/tools/registry.ts`. Tools are conditionally included based on env vars.

## Agent Architecture

- Agent loop: `src/agent/agent.ts`. Iterative tool-calling loop with configurable max iterations (default 10).
- Scratchpad: `src/agent/scratchpad.ts`. Single source of truth for all tool results within a query.
- Context management: Full tool results kept in context; oldest results cleared when token threshold exceeded.
- Final answer: generated in a separate LLM call with full scratchpad context (no tools bound).
- Events: agent yields typed events (`tool_start`, `tool_end`, `thinking`, `answer_start`, `done`, etc.) for real-time UI updates.

## Environment Variables

- LLM keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`
- Ollama: `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- Search: `EXASEARCH_API_KEY` (preferred), `PERPLEXITY_API_KEY`, `TAVILY_API_KEY` (fallback)
- Tracing: `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING`
- Never commit `.env` files or real API keys.

## Version & Release

- Version format: CalVer `YYYY.M.D` (no zero-padding). Tag prefix: `v`.
- Release script: `bash scripts/release.sh [version]` (defaults to today's date).
- Release flow: bump version in `package.json`, create git tag, push tag, create GitHub release via `gh`.
- Do not push or publish without user confirmation.

## Testing

- Framework: Bun's built-in test runner (primary), Jest config exists for legacy compatibility.
- Tests colocated as `*.test.ts`.
- Run `bun test` before pushing when you touch logic.

## Security

- API keys stored in `.env` (gitignored). Users can also enter keys interactively via the CLI.
- Config stored in `.carlo/settings.json` (gitignored).
- Never commit or expose real API keys, tokens, or credentials.
