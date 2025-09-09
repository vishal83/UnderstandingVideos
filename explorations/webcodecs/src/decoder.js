import { parseIvf, isVp8Keyframe } from './ivf.js';
import { log } from './logger.js';

export async function decodeIvfToCanvas({ file, canvas, onStatus, __onRendered, __onChunk, __onError }) {
	if (!('VideoDecoder' in globalThis)) throw new Error('VideoDecoder not supported');

	onStatus?.('Reading file...');
	const arrayBuffer = await file.arrayBuffer();
	const { header, frames } = parseIvf(arrayBuffer);
	log('IVF header', header, 'frames:', frames.length);
	if (header.fourcc !== 'VP80') throw new Error(`Only VP8/IVF supported in this demo. Found ${header.fourcc}`);

	canvas.width = header.width;
	canvas.height = header.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D context not available');

	const render = async (videoFrame) => {
		try {
			const bitmap = await createImageBitmap(videoFrame);
			ctx.drawImage(bitmap, 0, 0);
			bitmap.close();
			__onRendered?.();
		} finally {
			videoFrame.close();
		}
	};

	let resolveStop;
	const stopPromise = new Promise((r) => (resolveStop = r));
	let stopped = false;

	const decoder = new VideoDecoder({
		output: (frame) => {
			if (!stopped) render(frame);
			else frame.close();
		},
		error: (e) => {
			log('VideoDecoder error:', e);
			__onError?.();
		},
	});

	const config = { codec: 'vp8', codedWidth: header.width, codedHeight: header.height };
	const support = await VideoDecoder.isConfigSupported(config);
	log('Decoder support', support);
	if (!support.supported) throw new Error('Decoder config not supported');
	decoder.configure(config);

	onStatus?.('Decoding frames...');
	let firstTimestamp = frames.length ? frames[0].timestamp : 0;
	let lastDisplayTime = performance.now();
	for (let i = 0; i < frames.length && !stopped; i++) {
		const { data, timestamp } = frames[i];
		const chunk = new EncodedVideoChunk({
			type: isVp8Keyframe(data) ? 'key' : 'delta',
			timestamp: Math.round(((timestamp - firstTimestamp) / header.timebaseDen) * 1e6),
			data,
		});
		decoder.decode(chunk);
		__onChunk?.();
		if (i % 30 === 0) log('Decoded chunks fed:', i + 1);

		const msPerFrame = 1000 / (header.timebaseDen / header.timebaseNum);
		const nextTarget = lastDisplayTime + msPerFrame;
		const delay = Math.max(0, nextTarget - performance.now());
		if (delay > 0) await new Promise((r) => setTimeout(r, delay));
		lastDisplayTime = performance.now();
	}

	await decoder.flush();
	decoder.close();
	resolveStop?.();
	log('IVF decode finished');

	return () => {
		stopped = true;
		resolveStop?.();
		log('IVF decode stopped');
	};
}
