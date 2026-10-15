import {mkdir, copyFile} from 'node:fs/promises';

// Give static hosts a real entry point instead of rewriting to /index.html,
// which Cloudflare canonicalizes back to the homepage.
await mkdir('dist/partners', {recursive: true});
await copyFile('dist/index.html', 'dist/partners/index.html');
