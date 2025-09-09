function writeUint32LE(view, offset, value) {
	view.setUint32(offset, value >>> 0, true);
}

function writeUint16LE(view, offset, value) {
	view.setUint16(offset, value & 0xffff, true);
}

function writeUint64LE(view, offset, valueBigInt) {
	view.setBigUint64(offset, BigInt(valueBigInt), true);
}

function readString(view, offset, length) {
	let s = '';
	for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i));
	return s;
}

function writeFourCC(view, offset, fourcc) {
	for (let i = 0; i < 4; i++) view.setUint8(offset + i, fourcc.charCodeAt(i));
}

function readFourCC(view, offset) {
	return readString(view, offset, 4);
}

export function createIvfWriter(width, height, fps, fourcc = 'VP80') {
	const frames = [];
	const timebaseNum = 1; // ticks per frame
	const timebaseDen = fps; // frames per second

	return {
		addFrame(data, timestampTicks) {
			frames.push({ data, timestampTicks });
		},
		finalize() {
			const numFrames = frames.length;
			let totalSize = 32; // header
			for (const f of frames) totalSize += 12 + f.data.byteLength;
			const buffer = new ArrayBuffer(totalSize);
			const view = new DataView(buffer);

			// File header (32 bytes)
			writeFourCC(view, 0, 'DKIF');
			writeUint16LE(view, 4, 0); // version
			writeUint16LE(view, 6, 32); // header size
			writeFourCC(view, 8, fourcc);
			writeUint16LE(view, 12, width);
			writeUint16LE(view, 14, height);
			writeUint32LE(view, 16, timebaseDen);
			writeUint32LE(view, 20, timebaseNum);
			writeUint32LE(view, 24, numFrames);
			writeUint32LE(view, 28, 0);

			let offset = 32;
			for (const f of frames) {
				writeUint32LE(view, offset, f.data.byteLength);
				writeUint64LE(view, offset + 4, BigInt(f.timestampTicks));
				offset += 12;
				new Uint8Array(buffer, offset, f.data.byteLength).set(f.data);
				offset += f.data.byteLength;
			}

			return new Blob([buffer], { type: 'video/x-ivf' });
		},
	};
}

export function parseIvf(arrayBuffer) {
	const view = new DataView(arrayBuffer);
	if (readFourCC(view, 0) !== 'DKIF') throw new Error('Not an IVF file');
	const headerSize = view.getUint16(6, true);
	const fourcc = readFourCC(view, 8);
	const width = view.getUint16(12, true);
	const height = view.getUint16(14, true);
	const timebaseDen = view.getUint32(16, true);
	const timebaseNum = view.getUint32(20, true);
	const numFrames = view.getUint32(24, true);

	let offset = headerSize;
	const frames = [];
	for (let i = 0; i < numFrames; i++) {
		if (offset + 12 > arrayBuffer.byteLength) break;
		const size = view.getUint32(offset, true);
		const timestamp = Number(view.getBigUint64(offset + 4, true));
		offset += 12;
		const data = new Uint8Array(arrayBuffer, offset, size);
		offset += size;
		frames.push({ timestamp, data });
	}

	return { header: { fourcc, width, height, timebaseNum, timebaseDen, numFrames }, frames };
}

export function isVp8Keyframe(data) {
	// For VP8, frame type is the least significant bit of first byte: 0 = keyframe
	return (data[0] & 0x01) === 0;
}
