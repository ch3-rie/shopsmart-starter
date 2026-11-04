import { z } from 'zod';
import { assistantQuestionSchema } from '../validators/schemas.js';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'has', 'any', 'you', 'your', 'below', 'under',
  'above', 'over', 'than', 'less', 'what', 'which', 'find', 'show', 'recommend', 'recommended',
  'please', 'want', 'need', 'looking', 'available', 'availability', 'stock', 'cheapest', 'affordable',
  'budget', 'peso', 'pesos', 'php', 'product', 'products', 'item', 'items', 'can', 'does', 'are',
  'there', 'get', 'buy', 'some', 'from', 'into', 'about', 'how', 'much', 'who', 'was', 'were', 'will',
  'just', 'also', 'not', 'but', 'its', 'shop', 'shopsmart', 'currently', 'within', 'most', 'lowest',
  'price', 'priced', 'something', 'would', 'could', 'should', 'help', 'make', 'like', 'good', 'best'
]);

const SYNONYMS = {
  headphone: ['headphone', 'headphones', 'headset'],
  headphones: ['headphone', 'headphones', 'headset'],
  headset: ['headphone', 'headphones', 'headset'],
  keyboard: ['keyboard', 'keyboards'],
  keyboards: ['keyboard', 'keyboards'],
  mouse: ['mouse', 'mice'],
  mice: ['mouse', 'mice'],
  monitor: ['monitor', 'monitors', 'display', 'displays'],
  monitors: ['monitor', 'monitors', 'display'],
  display: ['monitor', 'display', 'displays'],
  webcam: ['webcam', 'webcams', 'camera'],
  webcams: ['webcam', 'camera'],
  camera: ['camera', 'webcam'],
  lamp: ['lamp', 'lamps'],
  lamps: ['lamp', 'lamps'],
  stand: ['stand', 'stands'],
  stands: ['stand', 'stands']
};

const FOCUS_PATTERNS = [
  [/headphones?|headset/, 'headphones'],
  [/keyboards?/, 'keyboard'],
  [/\bmice\b|\bmouse\b/, 'mouse'],
  [/monitors?|\bdisplays?\b/, 'monitor'],
  [/webcams?|\bcamera\b/, 'webcam'],
  [/\blamps?\b/, 'lamp'],
  [/\bstands?\b/, 'stand']
];

const PLURALS = {
  keyboard: 'keyboards',
  mouse: 'mice',
  monitor: 'monitors',
  webcam: 'webcams',
  lamp: 'lamps',
  stand: 'stands',
  headphones: 'headphones',
  product: 'products'
};

const CLAIM_TERMS = [
  'waterproof', 'water-resistant', 'bluetooth', 'wireless', 'mechanical', 'rgb', 'ergonomic',
  'rechargeable', 'noise-cancelling', 'noise-canceling', 'noise-reducing', 'gaming', 'foldable',
  'aluminum', 'aluminium', 'microphone', 'silent', 'optical', 'hot-swappable', 'tactile', '4k',
  '8k', '1080p', '1440p', 'hdmi', 'usb-c', 'usb', 'adjustable', 'privacy'
];

const SUPERLATIVES = /\b(best|fastest|newest|highest quality|top-rated|top rated|award-winning|premium)\b/i;
const UNSUPPORTED_AVAILABILITY = /\b(out of stock|sold out|unavailable)\b/i;
const URL_PATTERN = /https?:\/\/|www\.|javascript:/i;
const BUDGET_PATTERN = /\b(?:below|under|less than|cheaper than|within|budget of|max(?:imum)?|at most|up to)\s+(?:[a-z]+\s+){0,4}(?:₱|php\s*)?(\d{2,6})(?:\.(\d{1,2}))?/i;
const CURRENCY_PATTERN = /(?:₱|php\s*)(\d{2,6})(?:\.(\d{1,2}))?/i;
const STOCK_QUANTITY_PATTERN = /\b(\d+)\s+in stock\b/gi;

const draftAnswerSchema = z.string().trim().min(1).max(800);

export const CATALOG_SELECT = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
  stock: true
};

export function toCents(value) {
  const match = String(value ?? '').trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const whole = Number(match[2]);
  const digits = match[3] || '';
  let cents = whole * 100 + Number(digits.slice(0, 2).padEnd(2, '0') || 0);
  if (Number(digits[2] || 0) >= 5) cents += 1;
  return sign * cents;
}

export function formatPeso(value) {
  const cents = toCents(value);
  if (cents === null) return '0';
  const whole = Math.trunc(Math.abs(cents) / 100);
  const fraction = Math.abs(cents) % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === 0 ? grouped : `${grouped}.${String(fraction).padStart(2, '0')}`;
}

function amountFromMatch(match) {
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return cents / 100;
}

export function parseBudget(question) {
  const normalized = String(question ?? '').replaceAll(',', '');
  return amountFromMatch(normalized.match(BUDGET_PATTERN)) ?? amountFromMatch(normalized.match(CURRENCY_PATTERN));
}

export function redactQuestion(question) {
  return String(question ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
    .replace(/\b(?:\+?63|0)9\d{9}\b/g, '[redacted phone]');
}

export function formatDecimal(value) {
  const cents = toCents(value);
  if (cents === null) return null;
  const whole = Math.trunc(Math.abs(cents) / 100);
  const fraction = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${whole}.${fraction}`;
}

export function extractTerms(question) {
  const terms = String(question ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term) && !/^\d+$/.test(term));
  return [...new Set(terms)];
}

function variantsFor(term) {
  const variants = new Set([term, ...(SYNONYMS[term] || [])]);
  if (term.endsWith('s') && term.length > 4) variants.add(term.slice(0, -1));
  return variants;
}

function termMatches(text, term) {
  for (const variant of variantsFor(term)) {
    if (text.includes(variant)) return true;
  }
  return false;
}

function isCheapestRequest(question) {
  return /\b(cheapest|lowest price|lowest-priced|least expensive|most affordable)\b/i.test(question);
}

function focusLabel(question) {
  const text = String(question ?? '').toLowerCase();
  for (const [pattern, label] of FOCUS_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return extractTerms(question)[0] || null;
}

function pluralize(label) {
  return PLURALS[label] || (label.endsWith('s') ? label : `${label}s`);
}

function searchableText(product) {
  return `${product.name} ${product.category} ${product.description}`.toLowerCase();
}

export function rankProducts(products, question) {
  const terms = extractTerms(question);
  const budgetCents = parseBudget(question);
  const budgetLimit = budgetCents === null ? null : toCents(budgetCents);
  const cheapest = isCheapestRequest(question);
  return products
    .filter((product) => {
      if (product.active === false) return false;
      const stock = Number(product.stock);
      const cents = toCents(product.price);
      if (!Number.isInteger(Number(product.id)) || Number(product.id) < 1) return false;
      if (!Number.isFinite(stock) || stock <= 0 || cents === null) return false;
      return budgetLimit === null || cents <= budgetLimit;
    })
    .map((product) => {
      const text = searchableText(product);
      const score = terms.reduce((total, term) => total + (termMatches(text, term) ? 1 : 0), 0);
      return { ...product, price: toCents(product.price) / 100, score };
    })
    .filter((product) => terms.length === 0 || product.score > 0)
    .sort((left, right) => {
      if (cheapest) return toCents(left.price) - toCents(right.price) || right.score - left.score;
      return right.score - left.score || toCents(left.price) - toCents(right.price);
    });
}

export function productsNamedInQuestion(products, question) {
  const normalized = String(question ?? '').toLowerCase();
  const matches = products
    .filter((product) => product.active !== false && normalized.includes(String(product.name).toLowerCase()))
    .sort((left, right) => String(right.name).length - String(left.name).length);
  return matches.filter((product, index) => !matches.slice(0, index).some((longer) => (
    String(longer.name).toLowerCase().includes(String(product.name).toLowerCase())
  )));
}

export function selectProducts(products, question, limit = 3) {
  const named = productsNamedInQuestion(products, question);
  const pool = named.length > 0 ? named : products;
  return rankProducts(pool, question).slice(0, limit);
}

export function catalogWhere(question) {
  const budget = parseBudget(question);
  return {
    active: true,
    ...(budget === null ? {} : { price: { lte: formatDecimal(budget) } })
  };
}

export async function retrieveCatalog(db, question) {
  return db.product.findMany({
    where: catalogWhere(question),
    select: CATALOG_SELECT,
    orderBy: { price: 'asc' }
  });
}

export function toCatalogFacts(products) {
  return products.map((product) => ({
    id: Number(product.id),
    name: String(product.name),
    description: String(product.description ?? ''),
    category: String(product.category ?? ''),
    price: toCents(product.price) / 100,
    stock: Number(product.stock)
  }));
}

export function toRecommendation(product) {
  const id = Number(product.id);
  return {
    id,
    name: product.name,
    price: toCents(product.price) / 100,
    category: product.category,
    link: `/products/${id}`
  };
}

export function toSource(product) {
  return { type: 'product', id: Number(product.id), name: product.name };
}

function budgetPhrase(question) {
  const budget = parseBudget(question);
  return budget === null ? '' : ` within your ₱${formatPeso(budget)} budget`;
}

function subjectPhrase(question, count) {
  const subject = focusLabel(question) || 'product';
  if (count === 1) return subject.endsWith('s') ? subject : `a ${subject}`;
  return `${count} in-stock ${pluralize(subject)}`;
}

export function buildOutOfStockResponse(products) {
  const names = products.map((product) => product.name);
  const subject = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  const verb = names.length === 1 ? 'is' : 'are';
  const pronoun = names.length === 1 ? 'it' : 'them';
  return {
    answer: `${subject} ${verb} currently out of stock, so I can't recommend ${pronoun}.`,
    recommendedProducts: [],
    sources: []
  };
}

function unavailableNamedResponse(products, question) {
  const named = productsNamedInQuestion(products, question);
  if (named.length === 0 || named.some((product) => Number(product.stock) > 0)) return null;
  return buildOutOfStockResponse(named);
}

export function buildNoMatchResponse(question) {
  const subject = focusLabel(question) || 'product';
  const noun = subject.endsWith('s') ? `in-stock ${subject}` : `an in-stock ${subject}`;
  const suggestion = parseBudget(question) === null
    ? 'You may want to try a different product name or category.'
    : 'You may want to adjust your budget or explore other categories.';
  return {
    answer: `I couldn't find ${noun}${budgetPhrase(question)}. ${suggestion}`,
    recommendedProducts: [],
    sources: []
  };
}

export function buildRuleBasedResponse(ranked, question) {
  const subject = focusLabel(question) || 'product';
  const intro = isCheapestRequest(question)
    ? `I found the lowest-priced in-stock ${subject}${budgetPhrase(question)}.`
    : `I found ${subjectPhrase(question, ranked.length)}${budgetPhrase(question)}.`;
  const details = ranked
    .map((product) => `${product.name} is currently available for ₱${formatPeso(product.price)}.`)
    .join(' ');
  return {
    answer: `${intro} ${details}`,
    recommendedProducts: ranked.map(toRecommendation),
    sources: ranked.map(toSource)
  };
}

export function buildAssistantResponse(products, question) {
  const unavailable = unavailableNamedResponse(products, question);
  if (unavailable) return unavailable;
  const ranked = selectProducts(products, question);
  if (ranked.length === 0) return buildNoMatchResponse(question);
  return buildRuleBasedResponse(ranked, question);
}

function productCorpus(products) {
  return products.map(searchableText).join(' ');
}

function quotedPrices(answer) {
  const normalized = answer.replaceAll(',', '');
  const amounts = [];
  const pattern = /(?:₱|php\s*)(\d+)(?:\.(\d{1,2}))?|\b(\d+)(?:\.(\d{1,2}))?\s*pesos\b/gi;
  for (const match of normalized.matchAll(pattern)) {
    const whole = match[1] || match[3];
    const fraction = match[2] || match[4] || '';
    amounts.push(Number(whole) * 100 + Number(fraction.padEnd(2, '0')));
  }
  return amounts;
}

function hasUnsupportedClaim(answer, products) {
  const corpus = productCorpus(products);
  const normalized = answer.toLowerCase();
  if (SUPERLATIVES.test(answer) && !SUPERLATIVES.test(corpus)) return true;
  if (UNSUPPORTED_AVAILABILITY.test(answer) && products.every((product) => Number(product.stock) > 0)) return true;
  const stocks = new Set(products.map((product) => Number(product.stock)));
  for (const match of answer.matchAll(STOCK_QUANTITY_PATTERN)) {
    if (!stocks.has(Number(match[1]))) return true;
  }
  return CLAIM_TERMS.some((term) => normalized.includes(term) && !corpus.includes(term));
}

export function validateAssistantDraft(draft, products, question) {
  const answerResult = draftAnswerSchema.safeParse(draft?.answer);
  if (!answerResult.success || !Array.isArray(draft?.productIds) || draft.productIds.length === 0) return null;
  const answer = answerResult.data;
  if (URL_PATTERN.test(answer)) return null;

  const byId = new Map(products.map((product) => [Number(product.id), product]));
  const selected = [];
  for (const value of draft.productIds) {
    const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isInteger(id) || !byId.has(id)) return null;
    if (!selected.some((product) => Number(product.id) === id)) selected.push(byId.get(id));
  }
  const chosen = selected.slice(0, 3);
  const budgetCents = parseBudget(question);
  const budgetLimit = budgetCents === null ? null : toCents(budgetCents);
  const allowedPrices = new Set(chosen.map((product) => toCents(product.price)));
  if (budgetLimit !== null) allowedPrices.add(budgetLimit);

  for (const product of chosen) {
    if (product.active === false || Number(product.stock) <= 0) return null;
    if (budgetLimit !== null && toCents(product.price) > budgetLimit) return null;
  }
  if (!chosen.some((product) => answer.toLowerCase().includes(String(product.name).toLowerCase()))) return null;
  const selectedIds = new Set(chosen.map((product) => Number(product.id)));
  const mentionsUnselected = products.some((product) => (
    !selectedIds.has(Number(product.id)) && answer.toLowerCase().includes(String(product.name).toLowerCase())
  ));
  if (mentionsUnselected) return null;
  if (quotedPrices(answer).some((cents) => !allowedPrices.has(cents))) return null;
  if (hasUnsupportedClaim(answer, chosen)) return null;

  return {
    answer,
    recommendedProducts: chosen.map(toRecommendation),
    sources: chosen.map(toSource)
  };
}

export async function answerAssistantQuestion(question, products, { generate, logger = console.error } = {}) {
  const unavailable = unavailableNamedResponse(products, question);
  if (unavailable) return unavailable;
  const ranked = selectProducts(products, question);
  if (ranked.length === 0) return buildNoMatchResponse(question);

  if (typeof generate === 'function') {
    try {
      const draft = await generate({ question: redactQuestion(question), products: toCatalogFacts(ranked) });
      const validated = validateAssistantDraft(draft, ranked, question);
      if (validated) return validated;
      logger('[assistant] rejected unverified model draft');
    } catch (error) {
      const code = error?.code || 'PROVIDER_ERROR';
      const status = Number.isInteger(error?.status) ? ` ${error.status}` : '';
      logger(`[assistant] falling back to catalog rules (${code}${status})`);
    }
  }

  return buildRuleBasedResponse(ranked, question);
}

export async function handleAssistantQuestion(body, { retrieve, generate, logger } = {}) {
  const parsed = assistantQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 422,
      body: { error: { code: 'INVALID_QUESTION', message: 'Question must contain between 3 and 300 characters.' } }
    };
  }

  const question = parsed.data.question;
  const products = await retrieve(question);
  return {
    status: 200,
    body: await answerAssistantQuestion(question, products, { generate, logger })
  };
}
