import OpenAI from 'openai';

const mistralModel = process.env.MISTRAL_MODEL;

if (!mistralModel) {
  throw new Error('MISTRAL_MODEL environment variable must be set.');
}

const timeoutMs = process.env.MISTRAL_TIMEOUT_MS 
  ? parseInt(process.env.MISTRAL_TIMEOUT_MS, 10) 
  : 300000;

export const llm = new OpenAI({
  baseURL: process.env.MISTRAL_BASE_URL!,
  apiKey: process.env.MISTRAL_API_KEY || "ollama",
  timeout: timeoutMs,
  defaultHeaders: {
    "ngrok-skip-browser-warning": "true",
  },
});

export const getModelName = () => mistralModel;
