import {mkdir, readFile, writeFile} from 'node:fs/promises';

// Give static hosts a real entry point instead of rewriting to /index.html,
// which Cloudflare canonicalizes back to the homepage.
const home = await readFile('dist/index.html', 'utf8');
for (const route of ['partners', 'cars']) {
  await mkdir('dist/' + route, { recursive: true });
  await writeFile('dist/' + route + '/index.html', home.replace(/<link data-home-preload[^>]*>/, ''));
}
