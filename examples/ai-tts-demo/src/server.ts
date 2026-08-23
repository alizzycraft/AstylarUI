import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { validateSpeechRequest } from './server/speech-api';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
let generationInFlight = false;

app.disable('x-powered-by');
app.use('/api/speech', express.json({ limit: '16kb', type: 'application/json' }));

app.post('/api/speech', async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (process.env['ASTYLAR_TTS_LIVE'] !== '1') {
    res.status(403).json({ error: { code: 'live_disabled', message: 'Live mode is disabled on this server.' } });
    return;
  }
  const apiKey = process.env['OPENAI_API_KEY']?.trim();
  if (!apiKey) {
    res.status(503).json({ error: { code: 'missing_credentials', message: 'The server has no OpenAI API key configured.' } });
    return;
  }
  const validation = validateSpeechRequest(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  if (generationInFlight) {
    res.status(429).json({ error: { code: 'busy', message: 'One speech request is already running. Try again shortly.' } });
    return;
  }

  generationInFlight = true;
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ...validation.value,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      res.status(response.status === 429 ? 429 : 502).json({
        error: {
          code: 'openai_error',
          message: response.status === 429
            ? 'OpenAI rate-limited the request. Try again shortly.'
            : 'OpenAI could not generate speech for this request.',
        },
      });
      return;
    }
    const audio = Buffer.from(await response.arrayBuffer());
    res.status(200)
      .setHeader('content-type', 'audio/mpeg')
      .setHeader('content-length', String(audio.byteLength))
      .send(audio);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    res.status(502).json({
      error: {
        code: timedOut ? 'upstream_timeout' : 'upstream_unavailable',
        message: timedOut ? 'OpenAI took too long to respond.' : 'The speech service is temporarily unavailable.',
      },
    });
  } finally {
    generationInFlight = false;
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
