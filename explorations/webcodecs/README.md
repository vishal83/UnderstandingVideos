# WebCodecs Playground

A minimal, self-contained web app to explore WebCodecs capabilities, encode a simple canvas animation to VP8 in IVF format, and decode IVF back to a canvas.

## Requirements
- Chromium-based browser with WebCodecs (Chrome 94+, Edge 94+, etc.)
- Secure context: localhost or HTTPS

## Run locally
No build step; this is a static site.

### Using Python (recommended)
```bash
cd /Users/visgupta/dev/git/webcodec
python3 -m http.server 8000
```
Open `http://localhost:8000`.

### Using Node
```bash
cd /Users/visgupta/dev/git/webcodec
npx --yes http-server -p 8000 -c-1
```
Open `http://localhost:8000`.

## Features
- Capability checks for WebCodecs APIs and common codecs
- Encode animated canvas to VP8 (IVF) with basic params
- Download IVF file
- Decode VP8 IVF and render to a canvas

## Notes
- This demo focuses on VP8 in IVF for clarity. Extending to AV1/VP9/H264 requires container/bitstream changes.
- Encoding uses an animation drawn in JS; you can adapt it to any canvas or `MediaStreamTrackGenerator` source.
- Decoding uses a naive IVF parser and simple frame pacing for demonstration purposes.
