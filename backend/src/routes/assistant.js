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
    const outcome = await handleAssistantQuestion(request.body, {
      retrieve: (question) => retrieveCatalog(prisma, question),
      generate: generateRecommendation
    });
    response.status(outcome.status).json(outcome.body);
  } catch (error) {
    next(error);
  }
});

export default router;
