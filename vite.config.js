import { defineConfig, loadEnv } from 'vite';
import { localCatalogue } from './scripts/local-catalogue.js';
import { localLeadApi } from './scripts/local-lead-api.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['MOTORMATE_SHEETS_', 'VITE_MOTORMATE_FIREBASE_', 'VITE_MOTORMATE_SMS_MODE']);
  return { plugins: [localLeadApi(env), localCatalogue()] };
});
