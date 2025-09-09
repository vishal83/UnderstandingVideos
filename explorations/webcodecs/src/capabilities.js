export async function runCapabilityChecks() {
	const apiSupport = {
		VideoEncoder: typeof globalThis.VideoEncoder !== 'undefined',
		VideoDecoder: typeof globalThis.VideoDecoder !== 'undefined',
		AudioEncoder: typeof globalThis.AudioEncoder !== 'undefined',
		AudioDecoder: typeof globalThis.AudioDecoder !== 'undefined',
		EncodedVideoChunk: typeof globalThis.EncodedVideoChunk !== 'undefined',
		VideoFrame: typeof globalThis.VideoFrame !== 'undefined',
		MediaCapabilities: typeof navigator.mediaCapabilities !== 'undefined',
	};

	const apisHtml = Object.entries(apiSupport)
		.map(([k, v]) => `${v ? '✅' : '❌'} ${k}`)
		.join('<br>');

	const isSecure = globalThis.isSecureContext ? '✅' : '❌';

	async function testEncoder(codec) {
		try {
			const res = await globalThis.VideoEncoder.isConfigSupported({
				codec,
				width: 640,
				height: 360,
				bitrate: 1_000_000,
				framerate: 30,
			});
			return !!res?.supported;
		} catch {
			return false;
		}
	}

	async function testDecoder(codec) {
		try {
			const res = await globalThis.VideoDecoder.isConfigSupported({
				codec,
				codedWidth: 640,
				codedHeight: 360,
			});
			return !!res?.supported;
		} catch {
			return false;
		}
	}

	const codecs = ['vp8', 'vp09.00.10.08', 'avc1.42E01E', 'av01.0.08M.08'];
	const checks = await Promise.all(
		codecs.map(async (c) => {
			const [enc, dec] = await Promise.all([testEncoder(c), testDecoder(c)]);
			return { c, enc, dec };
		})
	);

	const codecsHtml = checks
		.map((r) => `${r.enc ? '✅' : '❌'} encode • ${r.dec ? '✅' : '❌'} decode — <code>${r.c}</code>`)
		.join('<br>');

	return [
		`<div><strong>APIs</strong><br>${apisHtml}</div>`,
		`<div><strong>Secure Context</strong><br>${isSecure} isSecureContext</div>`,
		`<div><strong>Codecs @ 640×360</strong><br>${codecsHtml}</div>`,
	].join('\n\n');
}
