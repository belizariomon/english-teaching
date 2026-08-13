import { openai } from './openai-client.js';

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
  const file = new File([new Uint8Array(audioBuffer)], `audio.${extension}`, {
    type: mimeType,
  });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
  });

  return transcription.text.trim();
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
