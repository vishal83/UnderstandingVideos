import { runCapabilityChecks } from './capabilities.js';
import { encodeCanvasToIvf } from './encoder.js';
import { decodeIvfToCanvas } from './decoder.js';
import { decodeMp4ToCanvas } from './mp4.js';
import { log, setLogTarget } from './logger.js';

const $ = (id) => document.getElementById(id);

function setStatus(el, text) {
	el.textContent = text;
	log('STATUS:', text);
}

// Capabilities wiring
(() => {
	const btn = $('btn-check');
	const results = $('cap-results');
	btn?.addEventListener('click', async () => {
		btn.disabled = true;
		results.textContent = 'Running checks...';
		log('Running capability checks');
		try {
			const out = await runCapabilityChecks();
			results.innerHTML = out;
			log('Capability checks done');
		} catch (err) {
			results.textContent = String(err?.message || err);
			log('Capability checks error:', err);
		} finally {
			btn.disabled = false;
		}
	});
})();

// Encoder wiring
(() => {
	const canvas = /** @type {HTMLCanvasElement} */ ($('enc-canvas'));
	const statusEl = $('enc-status');
	const btnStart = $('btn-encode');
	const btnCancel = $('btn-cancel-encode');
	const downloadLink = /** @type {HTMLAnchorElement} */ ($('download-link'));
	let controller = null;

	btnStart?.addEventListener('click', async () => {
		const width = Number($('enc-width').value);
		const height = Number($('enc-height').value);
		const fps = Number($('enc-fps').value);
		const seconds = Number($('enc-seconds').value);
		const bitrateKbps = Number($('enc-bitrate').value);

		btnStart.disabled = true;
		btnCancel.disabled = false;
		downloadLink.hidden = true;
		setStatus(statusEl, 'Encoding...');
		log('Encode start', { width, height, fps, seconds, bitrateKbps });

		controller = new AbortController();
		try {
			const blob = await encodeCanvasToIvf({
				canvas,
				width,
				height,
				fps,
				seconds,
				bitrateKbps,
				signal: controller.signal,
				onProgress: (i, total) => setStatus(statusEl, `Encoding frame ${i}/${total}`),
			});
			const url = URL.createObjectURL(blob);
			downloadLink.href = url;
			downloadLink.hidden = false;
			setStatus(statusEl, `Done. ${Math.round(blob.size / 1024)} KiB`);
			log('Encode done, size bytes:', blob.size);
		} catch (err) {
			if (controller?.signal?.aborted) log('Encode cancelled');
			else log('Encode error:', err);
			setStatus(statusEl, controller?.signal?.aborted ? 'Cancelled' : `Error: ${String(err?.message || err)}`);
		} finally {
			btnStart.disabled = false;
			btnCancel.disabled = true;
			controller = null;
		}
	});

	btnCancel?.addEventListener('click', () => {
		log('Encode cancel requested');
		controller?.abort?.();
	});
})();

// Decoder wiring (IVF or MP4)
(() => {
	const fileInput = /** @type {HTMLInputElement} */ ($('ivf-file'));
	const btnDecode = $('btn-decode');
	const btnStop = $('btn-stop');
	const statusEl = $('dec-status');
	const canvas = /** @type {HTMLCanvasElement} */ ($('dec-canvas'));
	const videoEl = /** @type {HTMLVideoElement} */ ($('mp4-video'));
	const logsEl = $('logs');
	let stopFn = null;

	setLogTarget(logsEl);

	function showCanvasOnly() {
		canvas.style.display = '';
		videoEl.hidden = true;
	}
	function showVideoAndCanvas() {
		canvas.style.display = '';
		videoEl.hidden = false;
	}

	fileInput?.addEventListener('change', () => {
		const hasFile = !!fileInput.files?.length;
		btnDecode.disabled = !hasFile;
		setStatus(statusEl, hasFile ? 'File ready' : 'No file loaded');
		if (hasFile) {
			const f = fileInput.files[0];
			log('Selected file:', { name: f.name, type: f.type, size: f.size });
		}
	});

	btnDecode?.addEventListener('click', async () => {
		if (!fileInput.files?.length) return;
		btnDecode.disabled = true;
		btnStop.disabled = true;
		setStatus(statusEl, 'Decoding...');
		try {
			const file = fileInput.files[0];
			const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
			const magic4 = String.fromCharCode(header[0], header[1], header[2], header[3]);
			log('Sniff header bytes:', Array.from(header).map((b) => b.toString(16).padStart(2, '0')).join(' '), 'magic:', magic4);

			if (magic4 === 'DKIF') {
				log('Routing to IVF decoder');
				showCanvasOnly();
				btnStop.disabled = false;
				stopFn = await decodeIvfToCanvas({ file, canvas, onStatus: (s) => setStatus(statusEl, s) });
			} else {
				log('Routing to MP4 path');
				showVideoAndCanvas();
				btnStop.disabled = false;
				stopFn = await decodeMp4ToCanvas({ file, canvas, onStatus: (s) => setStatus(statusEl, s), videoEl });
			}
			setStatus(statusEl, 'Playing');
		} catch (err) {
			log('Decode error:', err);
			setStatus(statusEl, `Error: ${String(err?.message || err)}`);
		} finally {
			btnDecode.disabled = false;
		}
	});

	btnStop?.addEventListener('click', () => {
		log('Stop requested');
		stopFn?.();
		btnStop.disabled = true;
		setStatus(statusEl, 'Stopped');
	});
})();
