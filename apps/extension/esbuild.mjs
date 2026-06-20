import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
});

if (watch) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}

// Copy block.asset.js to dist (not bundled — read at runtime by patcher)
mkdirSync('dist/adapters', { recursive: true });
cpSync('src/adapters/block.asset.js', 'dist/adapters/block.asset.js');
