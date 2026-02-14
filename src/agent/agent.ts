import { callLlm } from '../model/llm.js';
import { buildSystemPrompt } from '../agent/prompts.js';
import { InMemoryChatHistory } from '../utils/in-memory-chat-history.js';
import type { AgentConfig, AgentEvent, TokenUsage } from '../agent/types.js';

const DEFAULT_MODEL = 'gpt-5.2';

/**
 * Simple conversational agent - sends user messages to LLM and returns responses.
 * No tools, no research, just a clean chat wrapper.
 */
export class Agent {
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly signal?: AbortSignal;

  private constructor(config: AgentConfig, systemPrompt: string) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.systemPrompt = systemPrompt;
    this.signal = config.signal;
  }

  /**
   * Create a new Agent instance.
   */
  static create(config: AgentConfig = {}): Agent {
    const model = config.model ?? DEFAULT_MODEL;
    const systemPrompt = buildSystemPrompt(model);
    return new Agent(config, systemPrompt);
  }

  /**
   * Run the agent: send user message to LLM and yield the response.
   */
  async *run(query: string, inMemoryHistory?: InMemoryChatHistory): AsyncGenerator<AgentEvent> {
    const startTime = Date.now();

    // Build prompt with conversation history context
    const prompt = this.buildPrompt(query, inMemoryHistory);

    yield { type: 'answer_start' };

    try {
      const result = await callLlm(prompt, {
        model: this.model,
        systemPrompt: this.systemPrompt,
        signal: this.signal,
      });

      const response = result.response;
      const answer = typeof response === 'string'
        ? response
        : (response as { content: string }).content || '';

      const totalTime = Date.now() - startTime;
      const usage = result.usage;

      yield {
        type: 'done',
        answer,
        toolCalls: [],
        iterations: 1,
        totalTime,
        tokenUsage: usage,
        tokensPerSecond: usage ? (usage.outputTokens / (totalTime / 1000)) : undefined,
      };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw e;
      }
      const totalTime = Date.now() - startTime;
      yield {
        type: 'done',
        answer: `Sorry, I encountered an error: ${e instanceof Error ? e.message : String(e)}`,
        toolCalls: [],
        iterations: 1,
        totalTime,
      };
    }
  }

  /**
   * Build prompt with conversation history context if available
   */
  private buildPrompt(
    query: string,
    inMemoryChatHistory?: InMemoryChatHistory
  ): string {
    if (!inMemoryChatHistory?.hasMessages()) {
      return query;
    }

    const userMessages = inMemoryChatHistory.getUserMessages();
    if (userMessages.length === 0) {
      return query;
    }

    const historyContext = userMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n');
    return `Current message: ${query}\n\nPrevious messages for context:\n${historyContext}`;
  }
}
