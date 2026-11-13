import { submitLead } from './lead-submission.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/leads') return submitLead(request, env);
    if (pathname === '/api/catalogue' && request.method === 'GET' && env.CATALOGUE) {
      const { results } = await env.CATALOGUE.prepare('SELECT record FROM models ORDER BY rank').all();
      return new Response('[' + results.map(row => row.record).join(',') + ']', {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    const photo = pathname.match(/^\/catalogue-photos\/([a-z0-9-]+\/[1-9]\d*\.webp)$/);
    if (photo && env.CATALOGUE_PHOTOS && ['GET', 'HEAD'].includes(request.method)) {
      const object = await env.CATALOGUE_PHOTOS.get(photo[1]);
      if (!object) return new Response(null, { status: 404 });
      return new Response(request.method === 'HEAD' ? null : object.body, {
        headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
