import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { generateRecommendation } from '../services/aiProvider.js';
import { handleAssistantQuestion, retrieveCatalog } from '../services/assistant.js';

const router = Router();

const assistantLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.'
    }
  }
});

router.post('/questions', assistantLimiter, async (request, response, next) => {
  try {
    // answerSource tells the customer and the instructor whether a live provider
    // draft was used or the catalog rules answered. The service logs only when it
    // rejects a draft or falls back, so a provider call with no log means the
    // validated provider draft was returned.
    let providerCalled = false;
    let fellBack = false;
    const outcome = await handleAssistantQuestion(request.body, {
      retrieve: (question) => retrieveCatalog(prisma, question),
      generate: (input) => {
        providerCalled = true;
        return generateRecommendation(input);
      },
      logger: (message) => {
        fellBack = true;
        console.error(message);
      }
    });
    if (outcome.status === 200) {
      outcome.body.answerSource = providerCalled && !fellBack ? 'ai_provider' : 'catalog_rules';
    }
    response.status(outcome.status).json(outcome.body);
  } catch (error) {
    next(error);
  }
});

export default router;
