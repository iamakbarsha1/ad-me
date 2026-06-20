import { readFileSync, writeFileSync, existsSync, rmSync,
  renameSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const BLOCK_START = '/* AD-ME-START */';
const BLOCK_END = '/* AD-ME-END */';
const BLOCK_RE = /\/\* AD-ME-START \*\/[\s\S]*?\/\* AD-ME-END \*\//g;

// Anchor verbs from Claude Code's spinner array — used as compatibility gate.
const ANCHORS = [
  '"Discombobulating"', '"Flibbertigibbeting"', '"Combobulating"',
  '"Clauding"', '"Reticulating"', '"Smooshing"', '"Wibbling"', '"Booping"',
];
const ARRAY_RE = /\[(?:"[^"\\]*"\s*,\s*)+"[^"\\]*"\]/g;

export interface PatchParams {
  adText: string;
  ctaUrl: string;
  adId: string;
}

export class Patcher {
  private readonly target: string;

  constructor(target: string) {
    this.target = resolve(target);
  }

  private backupPath(): string {
    return this.target + '.ad-me-backup';
  }

  private findVerbArray(src: string): boolean {
    for (const m of src.matchAll(ARRAY_RE)) {
      if (ANCHORS.some(a => m[0].includes(a))) return true;
    }
    return false;
  }

  /** Check if Claude Code build is compatible (has verb array). */
  isCompatible(): boolean {
    try {
      if (!existsSync(this.target)) return false;
      const bak = this.backupPath();
      if (existsSync(bak)) {
        if (this.findVerbArray(readFileSync(bak, 'utf8'))) return true;
      }
      return this.findVerbArray(readFileSync(this.target, 'utf8'));
    } catch {
      return false;
    }
  }

  /** Check if already patched. */
  isPatched(): boolean {
    try {
      return existsSync(this.target) &&
        readFileSync(this.target, 'utf8').includes(BLOCK_START);
    } catch {
      return false;
    }
  }

  /** Backup original, inject ad block. Returns success. */
  applyPatch(params: PatchParams): { ok: boolean; reason?: string } {
    try {
      if (!existsSync(this.target)) return { ok: false, reason: 'target not found' };

      // Ensure pristine backup exists
      const pristine = this.ensureBackup();
      if (!pristine) return { ok: true, reason: 'already patched, no pristine backup' };

      if (!this.findVerbArray(pristine)) {
        return { ok: false, reason: 'verb array not found — incompatible CC build' };
      }

      // Strip any previous ad-me block, append new one
      let out = pristine.replace(BLOCK_RE, '').replace(/\s+$/, '');
      out = out + '\n' + this.renderBlock(params) + '\n';

      const outBuf = Buffer.from(out, 'utf8');
      this.atomicWrite(outBuf);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
  }

  /** Restore original from backup. */
  restore(): { ok: boolean; restored: boolean; reason?: string } {
    try {
      const bak = this.backupPath();
      if (!existsSync(bak)) {
        return { ok: true, restored: false, reason: 'no backup present' };
      }

      let pristine = readFileSync(bak);
      // Safety: strip our block from backup if somehow tainted
      if (pristine.indexOf(BLOCK_START) !== -1) {
        pristine = Buffer.from(
          pristine.toString('utf8').replace(BLOCK_RE, ''), 'utf8');
      }

      writeFileSync(this.target, pristine);
      rmSync(bak);
      return { ok: true, restored: true };
    } catch (e) {
      return { ok: false, restored: false, reason: String(e) };
    }
  }

  private ensureBackup(): string | null {
    const bak = this.backupPath();
    if (existsSync(bak)) {
      const buf = readFileSync(bak, 'utf8');
      // Tainted backup — delete and recapture
      if (buf.includes(BLOCK_START) || !this.findVerbArray(buf)) {
        try { unlinkSync(bak); } catch { /* fall through */ }
      } else {
        return buf;
      }
    }

    const raw = readFileSync(this.target, 'utf8');
    // Don't capture already-patched file as pristine
    if (raw.includes(BLOCK_START)) return null;

    writeFileSync(this.backupPath(), Buffer.from(raw, 'utf8'));
    return raw;
  }

  private renderBlock(p: PatchParams): string {
    const blockSrc = this.getBlockAsset();
    return blockSrc
      .replace(/__AD_ME_TEXT__/g, JSON.stringify(p.adText))
      .replace(/__AD_ME_URL__/g, JSON.stringify(p.ctaUrl))
      .replace(/__AD_ME_ID__/g, JSON.stringify(p.adId));
  }

  private getBlockAsset(): string {
    // esbuild bundles into dist/extension.js, so __filename = dist/extension.js
    // Asset lives at dist/adapters/block.asset.js
    const candidates = [
      join(dirname(__filename), 'adapters', 'block.asset.js'),
      join(dirname(__filename), 'block.asset.js'),
      join(dirname(__filename), '..', 'adapters', 'block.asset.js'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return readFileSync(p, 'utf8');
    }
    throw new Error(`block.asset.js not found (searched: ${candidates.join(', ')})`);
  }

  private atomicWrite(data: Buffer): void {
    const tmp = this.target + '.ad-me-tmp-' + process.pid + '-' + Date.now();
    try {
      writeFileSync(tmp, data);
      renameSync(tmp, this.target);
    } catch {
      try { unlinkSync(tmp); } catch { /* ignore */ }
      writeFileSync(this.target, data);
    }
  }
}
