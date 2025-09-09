let target = null;
const history = [];
const MAX = 200;

export function setLogTarget(el) {
	target = el || null;
	if (target) {
		target.textContent = history.join('\n');
	}
}

export function log(...args) {
	console.log('[WebCodecs]', ...args);
	try {
		const line = args
			.map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : JSON.stringify(a)))
			.join(' ');
		history.push(`${new Date().toISOString()} ${line}`);
		while (history.length > MAX) history.shift();
		if (target) {
			target.textContent = history.join('\n');
			target.scrollTop = target.scrollHeight;
		}
	} catch {}
}
