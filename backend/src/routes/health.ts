import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  console.log('Health check request received');
  response.json({ status: 'ok' });
});
