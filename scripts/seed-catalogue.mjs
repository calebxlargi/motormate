import { readFile } from 'node:fs/promises';

const models = JSON.parse(await readFile(new URL('../catalogue/malaysia-top-20.json', import.meta.url), 'utf8'));
console.log('CREATE TABLE IF NOT EXISTS models (rank INTEGER PRIMARY KEY, record TEXT NOT NULL);');
for (const model of models) {
  const record = JSON.stringify(model).replaceAll("'", "''");
  console.log(`INSERT OR REPLACE INTO models (rank, record) VALUES (${model.rank}, '${record}');`);
}
