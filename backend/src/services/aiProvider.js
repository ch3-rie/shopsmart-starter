import { redactQuestion, toCatalogFacts } from './assistant.js';

// Gemini generateContent REST API:
// https://ai.google.dev/api/generate-content
// The default model is the current Flash model recommended for new projects:
// https://ai.google.dev/gemini-api/docs/models
const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_TIMEOUT_MS = 8000;
const GENERATE_CONTENT_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export const ASSISTANT_SYSTEM_PROMPT = [
  "You are ShopSmart's product recommendation assistant.",
  "Answer the customer's actual question in one or two short, conversational sentences.",
  'Use only the product facts in the user message. Those facts are the entire catalog context.',
  'Refer to products by their exact name and include a price only when it exactly matches the supplied price.',
  "You may restate a budget that appears in the customer's question.",
  'Never invent product names, IDs, prices, descriptions, specifications, features, availability, or links.',
  'Never claim that a product is the best, fastest, newest, or highest quality.',
  'Never mention a feature unless that feature appears in the supplied name, category, or description.',
  'Recommend only IDs from the supplied products. Do not add products that were not supplied.',
  'If the supplied facts do not support a detail, say that the catalog does not include that detail.',
  'Do not place orders, change inventory, or ask for personal information.',
  'Return JSON with an answer string and productIds containing the supplied IDs you used.'
].join('\n');

export const ASSISTANT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'productIds'],
  properties: {
    answer: { type: 'string', description: 'Customer-facing answer grounded only in the supplied products.' },
    productIds: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'integer' },
      description: 'Supplied product IDs used in the answer, most relevant first.'
    }
  }
};

function providerError(code, status) {
  const error = new Error('The product assistant could not use the AI provider.');
  error.code = code;
  if (Number.isInteger(status)) error.status = status;
  return error;
}

function resolveTimeout(timeoutMs) {
  if (timeoutMs !== undefined) {
    const explicit = Number(timeoutMs);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
  }
  const configured = Number(process.env.GEMINI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS;
  return Math.min(15_000, Math.max(1_000, configured));
}

function resolveModel(model) {
  const selected = String(model || process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  if (!/^[A-Za-z0-9._-]+$/.test(selected)) return null;
  return selected;
}

export function buildProviderRequest({ question, products }) {
  return {
    systemInstruction: { parts: [{ text: ASSISTANT_SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [{ text: JSON.stringify({ question: redactQuestion(question), products: toCatalogFacts(products) }) }]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      responseJsonSchema: ASSISTANT_RESPONSE_SCHEMA
    }
  };
}

function candidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part) => part && part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

function parseModelJson(text) {
  const trimmed = String(text ?? '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  if (!trimmed) throw providerError('MALFORMED_RESPONSE');
  try {
    return JSON.parse(trimmed);
  } catch {
    throw providerError('MALFORMED_RESPONSE');
  }
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.name === 'TimeoutError' || error?.code === 'ABORT_ERR';
}

export async function generateRecommendation({
  question,
  products,
  fetchImpl = fetch,
  timeoutMs,
  apiKey = process.env.GEMINI_API_KEY,
  model
} = {}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!key) throw providerError('MISSING_API_KEY');
  if (!Array.isArray(products) || products.length === 0) throw providerError('PROVIDER_UNAVAILABLE');

  const selectedModel = resolveModel(model);
  if (!selectedModel) throw providerError('PROVIDER_UNAVAILABLE');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), resolveTimeout(timeoutMs));
  try {
    const response = await fetchImpl(`${GENERATE_CONTENT_URL}/${selectedModel}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify(buildProviderRequest({ question, products })),
      signal: controller.signal
    });

    if (!response.ok) {
      await response.arrayBuffer().catch(() => {});
      if (response.status === 429) throw providerError('PROVIDER_RATE_LIMIT', 429);
      if (response.status === 401 || response.status === 403) throw providerError('PROVIDER_AUTH', response.status);
      throw providerError('PROVIDER_ERROR', response.status);
    }

    let payload;
    try {
      payload = JSON.parse(await response.text());
    } catch {
      throw providerError('MALFORMED_RESPONSE');
    }
    return parseModelJson(candidateText(payload));
  } catch (error) {
    if (error?.code?.startsWith?.('PROVIDER_') || error?.code === 'MISSING_API_KEY' || error?.code === 'MALFORMED_RESPONSE') throw error;
    if (isAbortError(error)) throw providerError('PROVIDER_TIMEOUT');
    throw providerError('PROVIDER_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
}
