# AstylarUI AI text-to-speech demo

This is a standalone Angular 20 application that dogfoods AstylarUI as an external consumer. Its dark settings/editor/history layout is inspired by AI-TTS-MP3, while its implementation is designed around AstylarUI's public application API.

All visible application controls are composed into one `SiteData` document and rendered by one `AstylarSurfaceComponent`. Angular owns signals, speech orchestration, session history, validation, and browser audio. Local component builders produce reusable semantic `DOMElement` trees and ordered `StyleRule` definitions; they do not expose Babylon resources.

The app imports AstylarUI only from `astylarui`. The checked-in project intentionally excludes the packed tarball, installed dependencies, API keys, generated audio, build output, and browser-test captures.

## Run the default mock app

From the repository root, build and install a fresh packed copy of AstylarUI:

```bash
npm run tts-demo:prepare
cd examples/ai-tts-demo
npm start
```

Open `http://localhost:4200/`. Mock mode is selected by default, makes no network request, and creates a deterministic 0.65-second WAV tone. It exercises real generation, playback, progress, download, history, and cleanup behavior without spending API credit.

When rebuilding AstylarUI itself, stop the running demo, run
`npm run tts-demo:prepare` again from the repository root, and restart the demo.
Preparation clears Angular's optimized dependency cache, while this example's
start command disables dependency prebundling so the unchanged local package
version cannot leave an older renderer bundle active.

## Run live OpenAI speech

Live mode is deliberately available only from the built Express/SSR server. Prepare the package, build the app, then set both server environment variables before starting it:

```powershell
npm run tts-demo:prepare
Set-Location examples/ai-tts-demo
npm run build
$env:ASTYLAR_TTS_LIVE = '1'
$env:OPENAI_API_KEY = (Get-Content -Raw -LiteralPath 'C:\path\to\openai-key.txt').Trim()
npm run serve:ssr:ai-tts-demo
```

Open `http://localhost:4000/?speech=live`. The client sends the selected voice, instructions, and text to the same-origin `POST /api/speech` endpoint. The server calls OpenAI's [speech endpoint](https://platform.openai.com/docs/api-reference/audio/createSpeech) with `gpt-4o-mini-tts` and returns MP3 bytes. Remove the environment variables when the server stops.

Do not place a key in Angular environment files, URLs, `SiteData`, browser storage, or source code. `OPENAI_API_KEY` is read only by the server process. Live mode is disabled unless `ASTYLAR_TTS_LIVE=1`; the endpoint validates model, voice, instructions, and a 4,000-character input limit, accepts only small JSON bodies, permits one in-flight request, times out after 45 seconds, disables caching, and returns safe errors without logging credentials or authorization headers.

The interface clearly identifies the voice as AI-generated. Audio and history remain in memory for the current tab and are never persisted by the app.

## Architecture

- `src/app/ui/component-builders.ts` contains private builders for buttons, labelled controls, status messages, progress, players, and history cards.
- `src/app/ui/tts-demo-site.ts` composes settings, editor, player, and history panels into immutable replacement `SiteData`, including 1050px, 760px, and 520px responsive rules.
- `src/app/speech/tts-demo.store.ts` owns Angular application state and maps typed Astylar events to generation, cancellation, playback, and history actions.
- `src/app/speech/mock-speech.gateway.ts` is the deterministic default; `live-speech.gateway.ts` is the same-origin live client.
- `src/server.ts` owns the credential boundary and OpenAI request.
- `src/app/speech/audio-playback.service.ts` owns the hidden browser `Audio` element, throttled progress, downloads, listeners, and blob URLs. Visible transport controls remain inside AstylarUI.

## Verification

From the repository root:

```bash
npm run tts-demo:check
```

That command builds and packs AstylarUI, copies this example to a temporary clean consumer, installs the real tarball, runs unit tests, builds browser and SSR output, confirms live mode is off by default, captures desktop/tablet/mobile renders, checks every responsive boundary, and exercises semantic text entry, voice selection, mock generation, playback, download, search, selection, deletion, validation, and repeated surface remounts in Chrome. It never calls OpenAI.

For focused local checks:

```bash
cd examples/ai-tts-demo
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

## Deliberate first-iteration limits

- OpenAI is the only provider and `gpt-4o-mini-tts` is the only model.
- Mock output is WAV; live output is MP3.
- History is session-only and disappears on refresh.
- Playback is non-streaming and uses an Angular-owned browser audio element.
- There are no custom voices, browser API-key field, persistent storage, code-editor line numbers, cost estimates, animations, Astylar plugins, custom materials, or 3D embellishments.
- The local builders remain private to this demo until real reuse demonstrates a stable public component API.
