import { createHash, randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { malaysianMobile, previewLeadRows } from '../src/buyerLeadPreview.js';

import { saveLeadRows } from './lead-sheets.js';
import { submitLead } from './lead-submission.js';

const verificationLifetime = 60 * 60 * 1000;

export function localLeadApi({ MOTORMATE_SHEETS_URL: url, MOTORMATE_SHEETS_SECRET: secret,
  VITE_MOTORMATE_SMS_MODE: smsMode,
  VITE_MOTORMATE_FIREBASE_PROJECT_ID: projectId,
  VITE_MOTORMATE_FIREBASE_TEST_PHONE: testPhone,
}) {
  const verificationRequired = ['firebase-test', 'dummy-test'].includes(smsMode);
  const firebaseAuth = smsMode === 'firebase-test' && projectId ? getAuth(initializeApp({ projectId }, randomUUID())) : null;
  const leadPhone = value => firebaseAuth && value.trim() === testPhone ? testPhone : malaysianMobile(value);
  const sessions = new Map();
  const sheets = { MOTORMATE_SHEETS_URL: url, MOTORMATE_SHEETS_SECRET: secret };

  return {
    name: 'motormate-local-leads',
    configureServer(server) {
      server.middlewares.use('/api/leads', async (request, response) => {
        const port = request.socket.localPort;
        const origin = request.headers.origin;
        if (verificationRequired ||
          !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress) ||
          ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(origin)) {
          response.writeHead(403).end();
          return;
        }
        const result = await submitLead(new Request(origin + '/api/leads', {
          method: request.method, headers: request.headers,
          ...(request.method === 'POST' ? { body: request, duplex: 'half' } : {}),
        }), sheets, { local: true });
        response.writeHead(result.status, Object.fromEntries(result.headers));
        response.end(await result.text());
      });

      if (!verificationRequired) return;
      server.middlewares.use('/api/local-lead', async (request, response) => {
        const send = (status, data) => {
          response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify(data));
        };
        const port = request.socket.localPort;
        if (request.method !== 'POST' ||
          !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress) ||
          ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(request.headers.origin)) {
          return send(403, { error: 'This demo endpoint is available only from the local form.' });
        }

        try {
          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 16000) return send(413, { error: 'The enquiry is too large.' });
          }
          const data = JSON.parse(body);
          const now = Date.now();
          for (const [id, session] of sessions) {
            if (now - session.verifiedAt.getTime() > verificationLifetime) sessions.delete(id);
          }
          if (request.url === '/verify') {
            if (smsMode === 'firebase-test' && (!firebaseAuth || !testPhone)) {
              return send(503, { error: 'Configure the Firebase test project and fictional number first.' });
            }
            const phone = typeof data.phone === 'string' && leadPhone(data.phone);
            if (!phone) return send(400, { error: 'Enter a valid mobile number.' });
            let id = randomUUID();
            if (firebaseAuth) {
              if (phone !== testPhone || typeof data.token !== 'string') {
                return send(400, { error: 'Use the configured Firebase fictional number and code.' });
              }
              let claims;
              try {
                claims = await firebaseAuth.verifyIdToken(data.token);
              } catch {
                return send(400, { error: 'Google could not verify this session. Request a new test code.' });
              }
              if (claims.phone_number !== phone || claims.firebase.sign_in_provider !== 'phone' ||
                Math.abs(now / 1000 - claims.auth_time) > 300) {
                return send(400, { error: 'Request a fresh verification for this number.' });
              }
              // A retry of the same verified credential must reuse the same lead session.
              id = createHash('sha256').update(data.token).digest('hex').slice(0, 32)
                .replace(/^(........)(....)(....)(....)(............)$/, '$1-$2-$3-$4-$5');
              if (sessions.has(id)) return send(200, { id });
            } else if (data.code !== '123456') {
              return send(400, { error: 'That code is incorrect.' });
            }
            sessions.set(id, { phone, verifiedAt: new Date(now) });
            return send(200, { id });
          }
          if (request.url !== '/submit') return send(404, { error: 'Unknown enquiry action.' });

          const session = sessions.get(data.id);
          const values = data.values;
          if (!session || typeof values?.phone !== 'string' || leadPhone(values.phone) !== session.phone) {
            return send(409, { error: 'Verify your mobile number again before submitting.', reverify: true });
          }
          if (typeof values.name !== 'string' || !values.name.trim() || typeof values.city !== 'string' || !values.city.trim() ||
            !Object.values(values).every(value => typeof value === 'string' || typeof value === 'boolean')) {
            return send(400, { error: 'The enquiry details are incomplete.' });
          }

          // Keep the same snapshot and submission ID if the Google response is lost.
          session.rows ??= previewLeadRows(values, session.verifiedAt, new Date(now), session.phone);
          const rows = session.rows;
          if (!url && !secret) return send(200, { rows, saved: false });
          const saved = await saveLeadRows(sheets, data.id, rows);
          return send(saved.saved ? 200 : saved.status, saved);
        } catch {
          return send(502, { error: 'Could not complete the request. Please retry.' });
        }
      });
    },
  };
}
