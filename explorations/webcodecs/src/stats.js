const defaultState = () => ({
	startMs: 0,
	lastUpdateMs: 0,
	framesDecoded: 0,
	framesRendered: 0,
	framesDropped: 0,
	decodeErrors: 0,
	avgFps: 0,
	windowFrames: 0,
	windowStartMs: 0,
});

export class Stats {
	constructor(targetEl) {
		this.el = targetEl;
		this.state = defaultState();
	}
	reset() {
		this.state = defaultState();
		this.state.startMs = performance.now();
		this.state.windowStartMs = this.state.startMs;
		this.render();
	}
	markDecoded(n = 1) {
		this.state.framesDecoded += n;
		this._tick();
	}
	markRendered(n = 1) {
		this.state.framesRendered += n;
		this.state.windowFrames += n;
		this._tick();
	}
	markDropped(n = 1) {
		this.state.framesDropped += n;
		this._tick();
	}
	markError(n = 1) {
		this.state.decodeErrors += n;
		this._tick();
	}
	_tick() {
		const now = performance.now();
		const dt = now - this.state.windowStartMs;
		if (dt >= 1000) {
			this.state.avgFps = this.state.windowFrames / (dt / 1000);
			this.state.windowFrames = 0;
			this.state.windowStartMs = now;
		}
		this.state.lastUpdateMs = now;
	}
	render() {
		const s = this.state;
		const lines = [
			`Frames decoded: ${s.framesDecoded}`,
			`Frames rendered: ${s.framesRendered}`,
			`Frames dropped: ${s.framesDropped}`,
			`Decode errors: ${s.decodeErrors}`,
			`Avg FPS (1s): ${s.avgFps.toFixed(1)}`,
		];
		if (this.el) this.el.textContent = lines.join('\n');
	}
}
