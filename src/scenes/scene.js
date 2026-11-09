export class Scene {
  constructor() { this.t = 0; this._resolve = null; }
  finish(v) { const r = this._resolve; this._resolve = null; r?.(v); }
}
