import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export default defineConfig({ base: './', build: { target: 'es2022' }, plugins:[{
  name:'version-offline-shell',
  closeBundle() {
    const version = createHash('sha256').update(readFileSync('dist/index.html')).digest('hex').slice(0,12);
    writeFileSync('dist/sw.js',readFileSync('dist/sw.js','utf8').replace('__BUILD_VERSION__',version));
  }
}] });
