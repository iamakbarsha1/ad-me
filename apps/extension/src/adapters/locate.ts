import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';

const EXTENSION_ROOTS = [
  join(homedir(), '.vscode', 'extensions'),
  join(homedir(), '.vscode-insiders', 'extensions'),
  join(homedir(), '.vscode-server', 'extensions'),
  join(homedir(), '.vscode-server-insiders', 'extensions'),
  join(homedir(), '.cursor', 'extensions'),
  join(homedir(), '.cursor-server', 'extensions'),
  join(homedir(), '.trae', 'extensions'),
];

/** Find all Claude Code webview/index.js paths, sorted newest version last. */
function globClaudeCode(root: string): string[] {
  try {
    if (!existsSync(root)) return [];
    const out: string[] = [];
    for (const name of readdirSync(root)) {
      if (!name.startsWith('anthropic.claude-code-')) continue;
      const idx = join(root, name, 'webview', 'index.js');
      if (existsSync(idx)) out.push(idx);
    }
    return out.sort();
  } catch {
    return [];
  }
}

/** Locate the newest Claude Code webview/index.js across all known roots. */
export function locateClaudeCodeWebview(): string | null {
  const explicit = process.env.AD_ME_CC_TARGET;
  if (explicit && existsSync(explicit)) return explicit;

  for (const root of EXTENSION_ROOTS) {
    const hits = globClaudeCode(root);
    if (hits.length) return hits[hits.length - 1]; // newest
  }
  return null;
}

/** Extract Claude Code version from the path. */
export function extractVersion(target: string): string | null {
  const m = /anthropic\.claude-code-(\d+\.\d+\.\d+)/.exec(target);
  return m ? m[1] : null;
}
