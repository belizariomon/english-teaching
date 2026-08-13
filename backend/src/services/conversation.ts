import { openai, toFile } from './openai-client.js';
const TUTOR_INSTRUCTIONS = `You are a friendly English tutor helping a Spanish-speaking learner practice conversational English.

Given what the student said in English:
- If there are grammar, vocabulary, or phrasing errors: provide a corrected sentence in "correction" and a brief explanation in "explanation".
- If the sentence is correct: set "correction" to the same sentence and "explanation" to a brief praise (e.g. "Great job, that was perfect!").
- Always include a short conversational "reply" to keep the practice going (1-2 sentences, natural and encouraging).

Respond only with the JSON fields requested. Keep explanations concise (1-3 sentences).`;

const TUTOR_SCHEMA = {
  type: 'object' as const,
  properties: {
    correction: {
      type: 'string' as const,
      description: 'Corrected sentence, or same if no errors',
    },
    explanation: {
      type: 'string' as const,
      description: 'Brief explanation of errors or praise',
    },
    reply: {
      type: 'string' as const,
      description: 'Short conversational reply to continue practice',
    },
  },
  required: ['correction', 'explanation', 'reply'] as const,
  additionalProperties: false,
};

export type ConversationResult = {
  transcript: string;
  correction: string;
  explanation: string;
  reply: string;
  audioBase64: string;
};

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const extension = extensionFromMime(mimeType);

  console.log('[transcription] Audio size:', audioBuffer.length);
  console.log('[transcription] MIME type:', mimeType);
  console.log('[transcription] Extension:', extension);

  if (!audioBuffer.length) {
    throw new Error('Audio buffer is empty');
  }

  const form = new FormData();

  const blob = new Blob([new Uint8Array(audioBuffer)], {
    type: mimeType || 'audio/webm',
  });

  form.append('file', blob, `audio.${extension}`);

  form.append('model', 'gpt-4o-mini-transcribe');

  console.log('[transcription] Sending request with native fetch...');

  const response = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    },
  );

  const responseText = await response.text();

  console.log('[transcription] HTTP status:', response.status);

  if (!response.ok) {
    console.error('[transcription] OpenAI error:', responseText);

    throw new Error(
      `OpenAI transcription failed (${response.status}): ${responseText}`,
    );
  }

  let result: { text?: string };

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON response from OpenAI: ${responseText}`);
  }

  const text = result.text?.trim();

  if (!text) {
    throw new Error('OpenAI returned an empty transcription');
  }

  console.log('[transcription] Text:', text);

  return text;
}

async function getTutorFeedback(transcript: string): Promise<{
  correction: string;
  explanation: string;
  reply: string;
}> {
  const response = await openai.responses.create({
    model: 'gpt-4o-mini',
    instructions: TUTOR_INSTRUCTIONS,
    input: transcript,
    text: {
      format: {
        type: 'json_schema',
        name: 'tutor_feedback',
        schema: TUTOR_SCHEMA,
        strict: true,
      },
    },
  });

  const raw = response.output_text;
  if (!raw) {
    throw new Error('Empty response from tutor model');
  }

  return JSON.parse(raw) as {
    correction: string;
    explanation: string;
    reply: string;
  };
}

async function synthesizeSpeech(text: string): Promise<string> {
  const speech = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text,
    response_format: 'mp3',
  });

  const buffer = Buffer.from(await speech.arrayBuffer());
  return buffer.toString('base64');
}

export async function processConversation(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<ConversationResult> {
  let transcript = '';
  console.log(
    'process.env.OPENAI_API_KEY:',
    process.env.OPENAI_API_KEY?.length ?? 0,
  );
  try {
    console.log('[openai] Testing API connection...');

    const models = await openai.models.list();

    console.log('[openai] API connection OK, models:', models.data.length);
  } catch (error) {
    console.error('[openai] API connection FAILED:', error);
  }

  try {
    transcript = await transcribeAudio(audioBuffer, mimeType);
  } catch (error) {
    console.error('[conversation] Error transcribing audio:', error);
    throw error;
  }

  const { correction, explanation, reply } = await getTutorFeedback(transcript);
  console.log('[conversation] Correction:', correction);
  console.log('[conversation] Explanation:', explanation);
  console.log('[conversation] Reply:', reply);
  const audioBase64 = await synthesizeSpeech(reply);
  console.log('[conversation] AudioBase64:', audioBase64);
  console.log('[conversation] Speech synthesized');
  return { transcript, correction, explanation, reply, audioBase64 };
}
