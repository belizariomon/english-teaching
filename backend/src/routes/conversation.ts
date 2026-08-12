import { Router } from 'express';
import multer from 'multer';
import { processConversation } from '../services/conversation.js';

const upload = multer({ storage: multer.memoryStorage() });

export const conversationRouter = Router();

conversationRouter.post(
  '/conversation',
  upload.single('audio'),
  async (request, response) => {
    console.log('Incoming request:', request);

    if (!process.env.OPENAI_API_KEY) {
      response.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
      return;
    }

    if (!request.file) {
      response
        .status(400)
        .json({
          error:
            'No audio file provided. Send multipart/form-data with field "audio".',
        });
      return;
    }

    try {
      const result = await processConversation(
        request.file.buffer,
        request.file.mimetype,
      );
      response.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'OpenAI request failed';
      response.status(502).json({ error: message });
    }
  },
);
