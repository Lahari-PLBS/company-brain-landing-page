import OpenAI from 'openai';

const model = process.env.LLM_MODEL || process.env.MISTRAL_MODEL || 'openai/gpt-oss-120b';
const baseURL = process.env.LLM_BASE_URL || process.env.MISTRAL_BASE_URL || 'https://api.groq.com/openai/v1';
const apiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY || process.env.MISTRAL_API_KEY || 'ollama';

const timeoutMs = (process.env.LLM_TIMEOUT_MS || process.env.MISTRAL_TIMEOUT_MS)
  ? parseInt((process.env.LLM_TIMEOUT_MS || process.env.MISTRAL_TIMEOUT_MS)!, 10)
  : 120000;

export const llm = new OpenAI({
  baseURL,
  apiKey,
  timeout: timeoutMs,
  defaultHeaders: {
    "ngrok-skip-browser-warning": "true",
  },
});

export const getModelName = () => model;
