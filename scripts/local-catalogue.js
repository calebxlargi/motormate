import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const readCatalogue = () => JSON.parse(readFileSync(
  new URL('../catalogue/malaysia-top-20.json', import.meta.url), 'utf8',
));

export function localCatalogue() {
  function mount(server) {
    const database = new DatabaseSync(':memory:');
    database.exec('CREATE TABLE models (rank INTEGER PRIMARY KEY, record TEXT NOT NULL)');
    const insert = database.prepare('INSERT INTO models VALUES (?, ?)');
    for (const model of readCatalogue()) insert.run(model.rank, JSON.stringify(model));
    const select = database.prepare('SELECT record FROM models ORDER BY rank');

    server.httpServer?.once('close', () => database.close());
    server.middlewares.use('/catalogue-photos', (request, response, next) => {
      const path = request.url?.match(/^\/([a-z0-9-]+)\/([1-9]\d*\.webp)$/);
      if (!path || !['GET', 'HEAD'].includes(request.method)) return next();
      const file = new URL('../catalogue/local-photos/' + path[1] + '/' + path[2], import.meta.url);
      if (!existsSync(file)) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader('Content-Type', 'image/webp');
      if (request.method === 'HEAD') response.end();
      else createReadStream(file).pipe(response);
    });
    server.middlewares.use('/api/catalogue', (request, response, next) => {
      if (request.method !== 'GET' || request.url !== '/') return next();
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end('[' + select.all().map(row => row.record).join(',') + ']');
    });
  }

  return { name: 'local-catalogue', configureServer: mount, configurePreviewServer: mount };
}
