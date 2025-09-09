import { createIvfWriter } from './ivf.js';

function drawFrame(ctx, t, width, height) {
	ctx.clearRect(0, 0, width, height);
	// Background gradient
	const g = ctx.createLinearGradient(0, 0, width, height);
	g.addColorStop(0, '#0a223a');
	g.addColorStop(1, '#142b4c');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, width, height);

	// Moving circle
	const radius = Math.min(width, height) * 0.1;
	const cx = width * (0.5 + 0.3 * Math.cos(t * 2 * Math.PI));
	const cy = height * (0.5 + 0.3 * Math.sin(t * 2 * Math.PI));
	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.fillStyle = '#4f9cf0';
	ctx.fill();

	// Text
	ctx.fillStyle = '#e6edf3';
	ctx.font = `${Math.round(height * 0.06)}px ui-sans-serif`;
	ctx.fillText('WebCodecs VP8 Encode', 24, 42);
}

export async function encodeCanvasToIvf({ canvas, width, height, fps, seconds, bitrateKbps, signal, onProgress }) {
	if (!('VideoEncoder' in globalThis)) throw new Error('VideoEncoder not supported');

	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D context not available');

	const totalFrames = Math.max(1, Math.round(seconds * fps));
	const ivf = createIvfWriter(width, height, fps, 'VP80');

	let frameIndex = 0;
	let nextKeyframe = 0;

	const encodedChunks = [];

	const encoder = new VideoEncoder({
		output: (chunk) => {
			encodedChunks.push(chunk);
		},
		error: (e) => {
			throw e;
		},
	});

	const config = {
		codec: 'vp8',
		width,
		height,
		bitrate: Math.max(100_000, Math.round(bitrateKbps * 1000)),
		framerate: fps,
	};
	const support = await VideoEncoder.isConfigSupported(config);
	if (!support.supported) throw new Error('Config not supported for VP8');
	encoder.configure(config);

	const start = performance.now();
	for (frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
		if (signal?.aborted) break;
		const t = frameIndex / totalFrames; // 0..1
		drawFrame(ctx, t, width, height);

		const frame = new VideoFrame(canvas, { timestamp: Math.round((frameIndex / fps) * 1e6) });
		const shouldKeyframe = frameIndex === nextKeyframe;
		encoder.encode(frame, { keyFrame: shouldKeyframe });
		frame.close();

		if (shouldKeyframe) nextKeyframe += fps; // one keyframe per second
		onProgress?.(frameIndex + 1, totalFrames);

		// Pace to target fps in encode loop visually
		const targetNext = start + ((frameIndex + 1) * 1000) / fps;
		const delay = Math.max(0, targetNext - performance.now());
		if (delay > 0) await new Promise((r) => setTimeout(r, delay));
	}

	await encoder.flush();
	encoder.close();

	// Build IVF from chunks
	for (const chunk of encodedChunks) {
		const data = new Uint8Array(chunk.byteLength);
		chunk.copyTo(data);
		ivf.addFrame(data, Math.round((chunk.timestamp / 1e6) * fps));
	}

	return ivf.finalize();
}
