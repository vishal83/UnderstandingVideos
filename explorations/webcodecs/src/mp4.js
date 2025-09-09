import { log } from './logger.js';

function waitForLoadedData(video) {
	if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		log('Video already has current data; readyState =', video.readyState);
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const onReady = () => {
			video.removeEventListener('loadeddata', onReady);
			log('loadeddata fired; readyState =', video.readyState);
			resolve();
		};
		video.addEventListener('loadeddata', onReady, { once: true });
	});
}

export async function decodeMp4ToCanvas({ file, canvas, onStatus, videoEl }) {
	const url = URL.createObjectURL(file);
	const video = videoEl || document.createElement('video');
	video.src = url;
	video.muted = true;
	video.playsInline = true;
	if (videoEl) videoEl.hidden = false;

	video.addEventListener('error', () => log('Video error:', video.error?.message || video.error?.code));
	video.addEventListener('loadeddata', () => log('Video loadeddata'));
	video.addEventListener('playing', () => log('Video playing'));

	try {
		await video.play();
		log('video.play() resolved');
	} catch (e) {
		log('video.play() rejected (autoplay?):', e);
	}

	await waitForLoadedData(video);

	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D context not available');

	onStatus?.('Decoding MP4...');
	log('MP4 canvas size', { w: canvas.width, h: canvas.height });

	let stop = false;
	let resolveStop;
	const stopPromise = new Promise((r) => (resolveStop = r));

	let frameCount = 0;
	if (typeof video.captureStream === 'function' && 'MediaStreamTrackProcessor' in window) {
		log('Using MediaStreamTrackProcessor path');
		const stream = video.captureStream();
		const [track] = stream.getVideoTracks();
		const processor = new MediaStreamTrackProcessor({ track });
		const reader = processor.readable.getReader();
		(async () => {
			while (!stop) {
				const { value: videoFrame, done } = await reader.read();
				if (done || stop) break;
				try {
					const bitmap = await createImageBitmap(videoFrame);
					ctx.drawImage(bitmap, 0, 0);
					bitmap.close();
					frameCount++;
					if (frameCount % 30 === 0) log('Rendered frames:', frameCount);
				} finally {
					videoFrame.close();
				}
			}
			resolveStop?.();
		})();
	} else {
		log('Using drawImage fallback path');
		const render = () => {
			if (stop) return resolveStop?.();
			ctx.drawImage(video, 0, 0);
			frameCount++;
			if (frameCount % 30 === 0) log('Rendered frames:', frameCount);
			if (video.requestVideoFrameCallback) {
				video.requestVideoFrameCallback(() => render());
			} else {
				requestAnimationFrame(render);
			}
		};
		render();
	}

	return () => {
		stop = true;
		try { video.pause(); } catch {}
		URL.revokeObjectURL(url);
		resolveStop?.();
		log('MP4 decode stopped');
	};
}
