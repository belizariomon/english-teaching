# English AI Tutor

A React + TypeScript application for practicing spoken English. The Express backend
transcribes audio, provides corrections, and synthesizes a response using OpenAI.

## Local development

Use Node.js 22.12 or later (Node.js 24 recommended) and npm.

From `backend/`:

```sh
npm ci
```

Copy `.env.example` to `.env` and configure `OPENAI_API_KEY`. Then run:

```sh
npm run dev
```

In another terminal, from `frontend/`:

```sh
npm ci
npm run dev
```

Open the URL shown by Vite under `/english-teaching/`. The development proxy
forwards `/api` requests to the backend on port 3001. The full application requires
an internet connection and OpenAI credentials; the recorder tests require neither.

## Verification

From `frontend/`:

```sh
npm test
npm run build
```

From `backend/`: `npm run build`.

The initial test suite covers normal recording, denied permissions, stopping without
an active recording, and empty audio. It uses browser API test doubles and does not
access a real microphone. It does not provide full application coverage.

## License

MIT. See [LICENSE](LICENSE).
