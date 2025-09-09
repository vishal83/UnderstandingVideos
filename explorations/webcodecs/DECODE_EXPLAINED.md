# Decoding vs Frame Access (WebCodecs demo)

Think of video like a flipbook: many pictures (frames) shown quickly. Two big ideas:

- Decoding: turn compressed bytes (codecs like H.264/VP8) into raw pixel frames.
- Frame access: get those decoded frames so you can draw/process them.

## Two routes in this demo

1) IVF → WebCodecs `VideoDecoder`
- We sniff the file for `DKIF` magic. If present, we parse IVF.
- We build `EncodedVideoChunk`s and feed them into `VideoDecoder('vp8')`.
- Decoder outputs `VideoFrame`s, which we draw to the canvas.
- Files: `src/decoder.js`, `src/ivf.js`.

2) MP4 → `<video>` + optional `MediaStreamTrackProcessor`
- MP4 is handed to the browser's `<video>` element; its internal pipeline demuxes & decodes.
- Frame access options:
  - Prefer: `video.captureStream()` + `MediaStreamTrackProcessor` → yields WebCodecs `VideoFrame` objects for canvas drawing.
  - Fallback: `requestVideoFrameCallback` or `requestAnimationFrame` → we `drawImage(video, ...)` onto the canvas.
- Files: `src/mp4.js`.

## Why you might see two playbacks on MP4
- We show the `<video>` (native playback) and also mirror frames to the canvas. This demonstrates both the built-in media pipeline and programmatic frame access.
- For IVF, there's no `<video>` shown—only canvas updates from WebCodecs decoding.

## Quick glossary
- Container (MP4/IVF): box that holds compressed video frames and timing.
- Codec (VP8/H.264/AV1): method to compress/decompress video.
- `VideoDecoder`: WebCodecs class that decodes compressed chunks into `VideoFrame`s.
- `VideoFrame`: a decoded frame (pixels) that you can draw or process.
- `MediaStreamTrackProcessor`: reads frames from a media track (e.g., from `<video>.captureStream()`).

## Source overview
- Routing & UI: `src/main.js`
- Capabilities: `src/capabilities.js`
- IVF parsing/writing: `src/ivf.js`
- VP8 encode: `src/encoder.js`
- VP8 IVF decode: `src/decoder.js`
- MP4 playback + frame access: `src/mp4.js`

