import { malaysianMobile, malaysiaDate, previewLeadRows, vehicle } from '../src/buyerLeadPreview.js';
import { saveLeadRows } from './lead-sheets.js';

const maxBody = 16000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const yesNo = ['Yes', 'No'];

async function readPayload(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return null;
  }
}

function validValues(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values) ||
    !Object.entries(values).every(([key, value]) =>
      typeof value === 'string' && value.length <= (key === 'notes' ? 1000 : 200) ||
      key === 'noLimit' && typeof value === 'boolean')) return false;

  const car = vehicle(values, 'buy');
  const trade = vehicle(values, 'trade');
  return Boolean(values.name?.trim() && values.city?.trim() && values.state?.trim() &&
    typeof values.phone === 'string' && malaysianMobile(values.phone) &&
    ['WhatsApp', 'Phone call'].includes(values.contact) &&
    car.brand && (car.brand === 'Help me choose' || car.model) &&
    ['New', 'Certified Pre-Owned', 'Open to either'].includes(values.condition) &&
    ['immediately', 'slider', 'stillPlanning', 'justResearching'].includes(values.timingChoice) &&
    (values.timingChoice !== 'slider' || /^[0-6]$/.test(values.timeline)) &&
    (values.noLimit === true || (/^\d+$/.test(values.budget) && Number.isSafeInteger(Number(values.budget)) && Number(values.budget) >= 30000)) &&
    [values.loan, values.insuranceQuote, values.trade, values.testDrive].every(answer => yesNo.includes(answer)) &&
    [...yesNo, 'Not sure'].includes(values.currentInsurance) &&
    (values.loan !== 'Yes' || /^(1 year|[2-9] years|Not sure)$/.test(values.loanDuration)) &&
    (values.trade !== 'Yes' || (trade.brand && trade.model)) &&
    (values.testDrive !== 'Yes' || !values.testDate ||
      (/^\d{4}-\d{2}-\d{2}$/.test(values.testDate) && values.testDate >= malaysiaDate() &&
        Number.isFinite(Date.parse(values.testDate)) && new Date(values.testDate).toISOString().slice(0, 10) === values.testDate)));
}

export async function submitLead(request, env, { local = false } = {}) {
  const reply = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  const url = new URL(request.url);
  if (request.method !== 'POST' || request.headers.get('Origin') !== url.origin ||
    !request.headers.get('Content-Type')?.startsWith('application/json')) {
    return reply(403, { error: 'Please submit the enquiry from the Motormate website.' });
  }
  if (!local && env.MOTORMATE_SMS_MODE !== 'off') {
    return reply(503, { error: 'Enquiries are temporarily unavailable. Please try again later.' });
  }

  const data = await readPayload(request);
  if (!data || typeof data.id !== 'string' || !uuid.test(data.id) || !validValues(data.values)) {
    return reply(400, { error: 'Some enquiry details are invalid. Please review your answers.' });
  }

  try {
    if (!local) {
      const ip = request.headers.get('CF-Connecting-IP');
      if (!env.MOTORMATE_TURNSTILE_SECRET || !env.LEAD_RATE_LIMIT || !ip) {
        return reply(503, { error: 'Enquiries are temporarily unavailable. Please try again later.' });
      }
      const limit = await env.LEAD_RATE_LIMIT.limit({ key: ip });
      if (!limit.success) return reply(429, { error: 'Too many attempts. Please wait a minute and try again.' });
      if (typeof data.token !== 'string' || !data.token || data.token.length > 2048) {
        return reply(403, { error: 'Please complete the security check and retry.' });
      }
      const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: env.MOTORMATE_TURNSTILE_SECRET, response: data.token, remoteip: ip }),
        signal: AbortSignal.timeout(5000),
      });
      const result = check.ok && await check.json();
      if (!result?.success || result.hostname !== url.hostname || result.action !== 'buyer_enquiry') {
        return reply(403, { error: 'The security check expired or failed. Please try again.' });
      }
    }

    const rows = previewLeadRows(data.values, null);
    const saved = await saveLeadRows(env, data.id, rows);
    if (!saved.saved) return reply(saved.status, { error: saved.error });
    return reply(200, local ? saved : { saved: true, no: saved.rows.Sheet1.No });
  } catch {
    return reply(502, { error: 'The save could not be confirmed. Please retry.' });
  }
}
