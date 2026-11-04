import dotenv from 'dotenv';
import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantQuestionSchema } from '../src/validators/schemas.js';
import {
  CATALOG_SELECT,
  answerAssistantQuestion,
  buildAssistantResponse,
  catalogWhere,
  handleAssistantQuestion,
  parseBudget,
  rankProducts,
  retrieveCatalog,
  toCents,
  validateAssistantDraft
} from '../src/services/assistant.js';
import { ASSISTANT_SYSTEM_PROMPT, generateRecommendation } from '../src/services/aiProvider.js';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });

const quiet = () => {};
const keyboard = { id: 1, name: 'Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: 1800, stock: 2 };
const mouse = { id: 2, name: 'Mouse', category: 'Accessories', description: 'Wireless mouse', price: 600, stock: 3 };
const products = [keyboard, mouse];
const groundedAnswer = 'Keyboard is currently available for ₱1,800.';

function failure(code, status) {
  const error = new Error('secret-provider-body');
  error.code = code;
  if (status) error.status = status;
  return error;
}

test('parseBudget extracts a peso budget', () => assert.equal(parseBudget('below ₱2,000'), 2000));

test('parseBudget keeps model numbers from becoming a budget', () => {
  assert.equal(parseBudget('Find a 1080p webcam under ₱1,500'), 1500);
  assert.equal(parseBudget('Show me a 1080p webcam'), null);
  assert.equal(parseBudget('₱650 mouse below ₱2,000'), 2000);
});

test('rankProducts respects the budget', () => assert.deepEqual(rankProducts(products, 'mouse below 700').map((product) => product.id), [2]));

test('assistant response contains traceable sources', () => assert.equal(buildAssistantResponse(products, 'keyboard').sources[0].id, 1));

test('budget comparisons use cents and exclude inactive or out-of-stock products', () => {
  const priced = [
    { id: 1, name: 'Budget Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: '1999.99', stock: 1, active: true },
    { id: 2, name: 'Pricey Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: '2000.01', stock: 4, active: true },
    { id: 3, name: 'Exact Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: '2000.00', stock: 1, active: true },
    { id: 4, name: 'Hidden Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: '1000.00', stock: 5, active: false },
    { id: 5, name: 'Gone Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: '900.00', stock: 0, active: true }
  ];
  const ranked = rankProducts(priced, 'keyboard below ₱2,000');
  assert.deepEqual(ranked.map((product) => product.id), [1, 3]);
  assert.equal(toCents(ranked[0].price), 199999);
  assert.equal(toCents(ranked[1].price), 200000);
});

test('keyword, synonym, and cheapest ranking use catalog text', () => {
  const catalog = [
    { id: 6, name: 'USB Headset', category: 'Audio', description: 'Over-ear headset with noise-reducing boom microphone.', price: 1350, stock: 7, active: true },
    { id: 7, name: 'Keyboard Mini', category: 'Accessories', description: 'Compact keyboard', price: 900, stock: 4, active: true },
    { id: 8, name: 'Keyboard Pro', category: 'Accessories', description: 'Mechanical keyboard', price: 1800, stock: 4, active: true },
    keyboard
  ];
  assert.deepEqual(rankProducts(catalog, 'Do you have any headphones in stock?').map((product) => product.id), [6]);
  assert.deepEqual(rankProducts(catalog, 'What is the cheapest available keyboard?').map((product) => product.id), [7, 8, 1]);
});

test('catalog retrieval keeps active products, including stock zero, and applies a budget', async () => {
  assert.deepEqual(catalogWhere('Show me a keyboard'), { active: true });
  assert.deepEqual(catalogWhere('keyboard below ₱2,000'), {
    active: true,
    price: { lte: '2000.00' }
  });
  const calls = [];
  await retrieveCatalog({
    product: { findMany: async (query) => { calls.push(query); return []; } }
  }, 'keyboard below ₱2,000');
  assert.deepEqual(calls[0].select, CATALOG_SELECT);
  assert.deepEqual(Object.keys(CATALOG_SELECT), ['id', 'name', 'description', 'category', 'price', 'stock']);
  assert.equal(calls[0].where.price.lte, '2000.00');
});

test('a grounded recommendation keeps catalog price, link, and public provider facts', async () => {
  let payload;
  const outcome = await handleAssistantQuestion({
    question: 'Which keyboard is below ₱2,000?',
    email: 'ana@example.com',
    customerName: 'Ana Reyes',
    address: 'Angeles City, Pampanga'
  }, {
    logger: quiet,
    retrieve: async () => [{ ...keyboard, email: 'ana@example.com', customerName: 'Ana Reyes', address: 'Angeles City' }],
    generate: async (input) => {
      payload = input;
      return { answer: groundedAnswer, productIds: [1, 1], price: 1, link: 'https://evil.example/deal' };
    }
  });

  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.answer, groundedAnswer);
  assert.equal(outcome.body.recommendedProducts[0].price, 1800);
  assert.equal(outcome.body.recommendedProducts[0].link, '/products/1');
  assert.deepEqual(outcome.body.sources, [{ type: 'product', id: 1, name: 'Keyboard' }]);
  assert.equal(outcome.body.recommendedProducts[0].id, outcome.body.sources[0].id);
  assert.equal(payload.question, 'Which keyboard is below ₱2,000?');
  assert.deepEqual(payload.products, [{
    id: 1, name: 'Keyboard', description: 'Mechanical keyboard', category: 'Accessories', price: 1800, stock: 2
  }]);
  assert.equal(JSON.stringify(payload).includes('ana@example.com'), false);
  assert.equal(JSON.stringify(payload).includes('Ana Reyes'), false);
  assert.equal(JSON.stringify(outcome.body).includes('evil.example'), false);
});

test('supported catalog wording can remain in a validated answer', async () => {
  const wireless = { id: 2, name: 'Wireless Mouse', category: 'Accessories', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', price: 650, stock: 12 };
  const result = await answerAssistantQuestion('Recommend an affordable gaming mouse.', [wireless], {
    logger: quiet,
    generate: async () => ({ answer: 'Wireless Mouse is currently available for ₱650.', productIds: [2] })
  });
  assert.equal(result.answer, 'Wireless Mouse is currently available for ₱650.');
  assert.equal(result.recommendedProducts[0].price, 650);
  assert.equal(result.recommendedProducts[0].link, '/products/2');
});

test('a named out-of-stock product is not replaced by a different product', async () => {
  let calls = 0;
  const result = await answerAssistantQuestion('Is the Test Keyboard available?', [
    { id: 7, name: 'Test Keyboard', category: 'Accessories', description: 'Disposable test product. Out of stock.', price: 500, stock: 0, active: true },
    { id: 2, name: 'Compact Mechanical Keyboard', category: 'Accessories', description: 'Hot-swappable compact keyboard with tactile switches.', price: 1850, stock: 8, active: true }
  ], {
    logger: quiet,
    generate: async () => { calls += 1; }
  });
  assert.equal(calls, 0);
  assert.equal(result.answer, "Test Keyboard is currently out of stock, so I can't recommend it.");
  assert.equal(result.answer.includes('Compact Mechanical Keyboard'), false);
  assert.deepEqual(result.recommendedProducts, []);
  assert.deepEqual(result.sources, []);
});

test('no matching product skips the provider and returns an empty grounded response', async () => {
  let calls = 0;
  const outcome = await handleAssistantQuestion({ question: 'Find a monitor under ₱500' }, {
    logger: quiet,
    retrieve: async () => products,
    generate: async () => { calls += 1; return { answer: 'A monitor is available.', productIds: [1] }; }
  });
  assert.equal(calls, 0);
  assert.equal(outcome.status, 200);
  assert.match(outcome.body.answer, /couldn't find an in-stock monitor within your ₱500 budget/i);
  assert.equal(outcome.body.answer.includes('Keyboard'), false);
  assert.deepEqual(outcome.body.recommendedProducts, []);
  assert.deepEqual(outcome.body.sources, []);
});

test('invalid questions fail validation and never reach retrieval or the provider', async () => {
  const cases = ['', '   ', 'ab', 'x'.repeat(301), null];
  for (const question of cases) {
    assert.equal(assistantQuestionSchema.safeParse({ question }).success, false);
    let calls = 0;
    const outcome = await handleAssistantQuestion({ question, email: 'ana@example.com' }, {
      logger: quiet,
      retrieve: async () => { calls += 1; return products; },
      generate: async () => { calls += 1; }
    });
    assert.equal(outcome.status, 422);
    assert.equal(outcome.body.error.code, 'INVALID_QUESTION');
    assert.equal(calls, 0);
    assert.equal(JSON.stringify(outcome.body).includes('ana@example.com'), false);
  }
  assert.equal(assistantQuestionSchema.safeParse({ question: 'abc' }).success, true);
  assert.equal(assistantQuestionSchema.safeParse({ question: 'a'.repeat(300) }).success, true);
});

test('invalid questions return HTTP 422 from the assistant route', async () => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://shopsmart_user:shopsmart_dev@localhost:5432/shopsmart?schema=public';
  }
  const { createApp } = await import('../src/app.js');
  const server = createApp().listen(0);
  try {
    const { port } = server.address();
    const bodies = [
      { question: '' },
      { question: '   ' },
      { question: 'ab' },
      { question: 'x'.repeat(301) },
      {},
      { question: 12 }
    ];
    for (const body of bodies) {
      const response = await fetch(`http://127.0.0.1:${port}/api/assistant/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      assert.equal(response.status, 422);
      assert.equal(payload.error.code, 'INVALID_QUESTION');
      assert.equal(JSON.stringify(payload).includes('GEMINI_API_KEY'), false);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('malformed, unknown, unselected, overpriced, unsupported, and linked drafts fall back', async () => {
  const drafts = [
    null,
    'not-json',
    { answer: 'Keyboard is currently available for ₱1,800.' },
    { productIds: [1] },
    { answer: groundedAnswer, productIds: [99] },
    { answer: 'Mouse is currently available for ₱600.', productIds: [2] },
    { answer: 'Keyboard is currently available for ₱9,999.', productIds: [1] },
    { answer: 'Keyboard is waterproof and currently available for ₱1,800.', productIds: [1] },
    { answer: `${groundedAnswer} See https://evil.example/keyboard`, productIds: [1] }
  ];
  for (const draft of drafts) {
    const result = await answerAssistantQuestion('keyboard', products, {
      logger: quiet,
      generate: async () => draft
    });
    assert.match(result.answer, /Keyboard is currently available for ₱1,800/);
    assert.equal(result.recommendedProducts[0].id, 1);
    assert.equal(result.recommendedProducts[0].price, 1800);
    assert.equal(result.recommendedProducts[0].link, '/products/1');
    assert.deepEqual(result.sources, [{ type: 'product', id: 1, name: 'Keyboard' }]);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('9999'), false);
    assert.equal(serialized.includes('waterproof'), false);
    assert.equal(serialized.includes('evil.example'), false);
    assert.equal(serialized.includes('https://'), false);
  }
});

test('an answer that names an unselected catalog product is rejected', () => {
  const draft = { answer: 'Keyboard is currently available for ₱1,800, unlike Mouse.', productIds: [1] };
  assert.equal(validateAssistantDraft(draft, products, 'accessories'), null);
});

test('provider failures keep the catalog recommendation', async () => {
  const failures = [
    failure('PROVIDER_TIMEOUT'),
    failure('PROVIDER_RATE_LIMIT', 429),
    failure('PROVIDER_ERROR', 503),
    failure('PROVIDER_AUTH', 401),
    failure('MISSING_API_KEY')
  ];
  for (const error of failures) {
    const result = await answerAssistantQuestion('Which keyboard is below ₱2,000?', products, {
      logger: quiet,
      generate: async () => { throw error; }
    });
    assert.match(result.answer, /I found a keyboard within your ₱2,000 budget/);
    assert.match(result.answer, /Keyboard is currently available for ₱1,800/);
    assert.equal(result.recommendedProducts[0].link, '/products/1');
    assert.equal(JSON.stringify(result).includes('secret-provider-body'), false);
    assert.deepEqual(Object.keys(result).sort(), ['answer', 'recommendedProducts', 'sources']);
  }
});

test('the provider client fails safely without a key, on HTTP errors, timeout, and malformed output', async () => {
  let called = false;
  await assert.rejects(
    () => generateRecommendation({ question: 'keyboard', products, apiKey: '   ', fetchImpl: () => { called = true; } }),
    (error) => error.code === 'MISSING_API_KEY' && !error.message.includes('AIza')
  );
  assert.equal(called, false);

  await assert.rejects(
    () => generateRecommendation({
      question: 'keyboard',
      products,
      apiKey: 'test-key',
      model: 'gemini-3.8-flash?key=test-key',
      fetchImpl: () => { called = true; }
    }),
    (error) => error.code === 'PROVIDER_UNAVAILABLE'
  );
  assert.equal(called, false);

  const cases = [
    [429, 'PROVIDER_RATE_LIMIT'],
    [500, 'PROVIDER_ERROR'],
    [401, 'PROVIDER_AUTH']
  ];
  for (const [status, code] of cases) {
    await assert.rejects(
      () => generateRecommendation({
        question: 'keyboard',
        products,
        apiKey: 'test-key-do-not-leak',
        fetchImpl: async () => new Response(JSON.stringify({ error: 'test-key-do-not-leak' }), { status })
      }),
      (error) => {
        assert.equal(error.code, code);
        assert.equal(error.status, status);
        assert.equal(error.message.includes('test-key-do-not-leak'), false);
        return true;
      }
    );
  }

  await assert.rejects(
    () => generateRecommendation({
      question: 'keyboard',
      products,
      apiKey: 'test-key',
      timeoutMs: 20,
      fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })
    }),
    (error) => error.code === 'PROVIDER_TIMEOUT'
  );

  await assert.rejects(
    () => generateRecommendation({
      question: 'keyboard',
      products,
      apiKey: 'test-key',
      fetchImpl: async () => { throw new Error('connect ECONNREFUSED 10.0.0.1'); }
    }),
    (error) => error.code === 'PROVIDER_UNAVAILABLE' && !error.message.includes('ECONNREFUSED')
  );

  await assert.rejects(
    () => generateRecommendation({
      question: 'keyboard',
      products,
      apiKey: 'test-key',
      fetchImpl: async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 })
    }),
    (error) => error.code === 'MALFORMED_RESPONSE'
  );
});

test('the provider request carries only public facts and the key stays in the header', async () => {
  let captured;
  const draft = await generateRecommendation({
    question: 'Which keyboard is below ₱2,000? Contact ana@example.com or 09171234567.',
    products: [{ ...keyboard, email: 'ana@example.com', customerName: 'Ana Reyes', address: 'Angeles City' }],
    apiKey: 'test-key-do-not-leak',
    model: 'gemini-3.8-flash',
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [
              { thought: true, text: 'ignore this private thought ana@example.com' },
              { text: '```json\n{"answer":"Keyboard is currently available for ₱1,800.","productIds":[1]}\n```' }
            ]
          }
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });

  assert.deepEqual(draft, { answer: groundedAnswer, productIds: [1] });
  assert.equal(captured.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.equal(captured.url.includes('test-key-do-not-leak'), false);
  assert.equal(captured.options.headers['x-goog-api-key'], 'test-key-do-not-leak');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.equal(body.systemInstruction.parts[0].text, ASSISTANT_SYSTEM_PROMPT);
  assert.match(ASSISTANT_SYSTEM_PROMPT, /Never invent product names/i);
  const userContent = JSON.parse(body.contents[0].parts[0].text);
  assert.equal(userContent.question.includes('ana@example.com'), false);
  assert.equal(userContent.question.includes('09171234567'), false);
  assert.deepEqual(userContent.products[0], {
    id: 1, name: 'Keyboard', description: 'Mechanical keyboard', category: 'Accessories', price: 1800, stock: 2
  });
  assert.equal(captured.options.body.includes('test-key-do-not-leak'), false);
  assert.equal(captured.options.body.includes('Ana Reyes'), false);
  assert.equal(captured.options.body.includes('Angeles City'), false);
});
