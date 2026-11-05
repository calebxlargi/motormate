import {mkdir, readFile, writeFile} from 'node:fs/promises';

// Give static hosts a real entry point instead of rewriting to /index.html,
// which Cloudflare canonicalizes back to the homepage.
await mkdir('dist/partners', {recursive: true});
const home = await readFile('dist/index.html', 'utf8');
await writeFile('dist/partners/index.html', home.replace(/<link data-home-preload[^>]*>/, ''));
