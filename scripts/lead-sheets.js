export async function saveLeadRows(env, id, rows) {
  const url = env.MOTORMATE_SHEETS_URL;
  const secret = env.MOTORMATE_SHEETS_SECRET;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url || '') || !secret || secret.length < 32) {
    return { status: 503, error: 'Enquiries are temporarily unavailable. Please try again later.' };
  }

  // Sign ASCII JSON so Apps Script and this runtime hash identical bytes.
  const payload = JSON.stringify({ id, rows, sentAt: Date.now() })
    .replace(/[^\x00-\x7f]/g, character => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
  const signature = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, signature }),
    signal: AbortSignal.timeout(20000),
  });
  const result = response.ok && await response.json();
  if (!Number.isSafeInteger(result?.no) || result.no < 1) {
    console.error('Motormate Sheets receiver:', result?.diagnostic || result?.error || response.status);
    return { status: 502, error: 'The save could not be confirmed. Please retry.' };
  }

  for (const row of Object.values(rows)) row.No = result.no;
  return { rows, saved: true };
}
