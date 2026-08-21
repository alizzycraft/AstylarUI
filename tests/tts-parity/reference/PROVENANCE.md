# Deterministic AI-TTS-MP3 reference adapter

- Source: `https://github.com/alizzycraft/ai-tts-mp3`
- Pinned commit: `35695edc53a5d848dd60255b902b6a1986e809a5`
- Source license at the pinned commit: MIT (see the upstream `LICENSE`).
- Presentation sources inspected/adapted: `src/presentation/styles.scss`, `app`, `home`, `settings-panel`, `editor`, `history-panel`, and `audio-player` HTML/SCSS files.

The adapter preserves the pinned presentation's three-column fixed-height shell, 320px side panels, overflow owners, 768px breakpoint, system font stack, colors, controls, editor, history card, and audio-player composition. Stable IDs were added solely for measurement. Angular bindings, routing, API calls, IndexedDB/local-storage behavior, file-system storage, audio playback, modal flows, animations, Google Fonts network loading, and external SVG fetching are intentionally omitted. Unicode placeholders replace decorative icons because icon shape is not an acceptance region. The two deterministic states are `initial` and `generated` (the representative `hello` result); neither uses storage, time, audio, credentials, or a network service.

This repository-owned adapter is comparison evidence, not a fork of the upstream application and not a claim that every upstream behavior is reproduced.
