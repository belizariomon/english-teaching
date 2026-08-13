import OpenAI from 'openai';
import { toFile } from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { toFile };
