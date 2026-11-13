import React, { useRef, useState } from 'react';
import carCatalogue from './car-catalog.json';
import Arrow from './Arrow';
import LeadTurnstile from './LeadTurnstile';
import { CarFields, Field, money, states, timelines, useBuyerStepScroll } from './EnquiryForms';
import { malaysiaDate, malaysianMobile, vehicle } from './buyerLeadPreview';

const stages = [
  'Tell us what you need', 'Find the right fit', 'Plan your purchase',
  'Sort out your trade-in', 'Take a test drive', 'Buy with confidence',
];
const screens = [
  { id: 0, stage: 0, title: 'About you', intro: 'Tell us where you are and how you’d like your consultant to reach you.' },
  { id: 1, stage: 0, title: 'Verify your mobile number', intro: 'Enter the SMS code before continuing to your car preferences.' },
  { id: 2, stage: 1, title: 'What fits you?', intro: 'Have a car in mind? Great. Still exploring? We’ll help you choose.' },
  { id: 3, stage: 2, title: 'Timing and budget', intro: 'Tell us when you would like to buy and what budget works for you.' },
  { id: 4, stage: 2, title: 'Financing and insurance', intro: 'Tell us whether you’d like help with a car loan or insurance.' },
  { id: 5, stage: 3, title: 'Your trade-in', intro: 'Tell us if you have a current car you’d like to trade in.' },
  { id: 6, stage: 4, title: 'Would you like a test drive?', intro: 'Your consultant can check availability for your preferred date.' },
  { id: 7, stage: 5, title: 'Review your enquiry', intro: 'Add any must-have features or requests, then check your details before submitting.' },
];
const initial = { timeline: '0', timingChoice: '', budget: '', noLimit: false };
function initialEnquiry() {
  const params = new URLSearchParams(window.location.search);
  const brand = params.get('brand');
  const model = params.get('model')?.trim().slice(0, 100);
  if (!Object.hasOwn(carCatalogue.models, brand) || !model) return initial;
  const knownModel = carCatalogue.models[brand].find(name => name.toLowerCase() === model.toLowerCase());
  return {
    ...initial,
    buyBrand: brand,
    buyModel: knownModel || 'Other model',
    buyOtherModel: knownModel ? '' : model,
    variant: params.get('variant')?.trim().slice(0, 100) || '',
  };
}

const yesNo = ['Yes', 'No'];
const dummyCode = '123456';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_MOTORMATE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_MOTORMATE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_MOTORMATE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_MOTORMATE_FIREBASE_APP_ID,
};
const fictionalPhone = import.meta.env.VITE_MOTORMATE_FIREBASE_TEST_PHONE;
const preview = import.meta.env.DEV;
const smsMode = import.meta.env.VITE_MOTORMATE_SMS_MODE;
const firebaseTest = preview && smsMode === 'firebase-test';
const verificationRequired = firebaseTest || (preview && smsMode === 'dummy-test');
const visibleScreens = screens.filter(screen => screen.id !== 1 || verificationRequired);
const turnstileSiteKey = import.meta.env.VITE_MOTORMATE_TURNSTILE_SITE_KEY;
const getLeadPhone = value => firebaseTest
  ? (value.trim() === fictionalPhone ? fictionalPhone : '')
  : malaysianMobile(value);

async function leadRequest(action, body) {
  const response = await fetch(verificationRequired ? '/api/local-lead/' + action : '/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ...await response.json(), status: response.status };
}

function PreviewRows({ rows }) {
  return Object.entries(rows).map(([tab, row]) => (
    <details className="lead-preview-row" key={tab}>
      <summary>{tab}</summary>
      <dl>
        {Object.entries(row).map(([column, value]) => (
          <div key={column}><dt>{column}</dt><dd>{value === '' ? '—' : value}</dd></div>
        ))}
      </dl>
    </details>
  ));
}

export default function BuyerEnquiryForm() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initialEnquiry);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completion, setCompletion] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileVersion, setTurnstileVersion] = useState(0);
  const submissionId = useRef(null);
  const firebaseVerifier = useRef(null);
  const confirmFirebaseCode = useRef(null);
  const firebaseToken = useRef(null);
  const progress = useRef(null);
  const result = useRef(null);
  useBuyerStepScroll(step, progress, window.location.hash === '#buyer-enquiry');

  const screenIndex = visibleScreens.findIndex(screen => screen.id === step);
  const screen = visibleScreens[screenIndex];
  const phone = getLeadPhone(values.phone || '');
  const { brand, model } = vehicle(values, 'buy');
  const canSelectVariant = brand && model && brand !== 'Help me choose' && model !== 'Help me choose';
  const set = (name, value) => {
    const changesVehicle = ['buyBrand', 'buyModel', 'buyOtherModel', 'buyOtherBrand'].includes(name);
    setValues(previous => ({ ...previous, ...(changesVehicle ? { variant: '' } : {}), [name]: value }));
    if (name === 'phone' && getLeadPhone(value) !== phone) {
      setVerificationId(null);
      confirmFirebaseCode.current = null;
      firebaseToken.current = null;
      setChallenge('');
      setCode('');
    }
    setError('');
  };
  const f = { values, set };
  const budgetLabel = values.noLimit ? 'No upper limit' : values.budget ? money(values.budget) : 'Set a budget';
  const selectedTimeline = timelines[Number(values.timeline)];
  const timingLabels = { immediately: 'Immediately', stillPlanning: 'Still planning', justResearching: 'Just researching', slider: selectedTimeline };

  async function startVerification() {
    setChallenge('');
    setCode('');
    setError('');
    if (firebaseTest) {
      setBusy(true);
      firebaseToken.current = null;
      try {
        const { beginFirebasePhoneTest } = await import('./firebasePhoneTest.js');
        confirmFirebaseCode.current = await beginFirebasePhoneTest(firebaseConfig, firebaseVerifier.current, phone);
      } catch (error) {
        const reason = typeof error.code === 'string' ? ' (' + error.code + ')' : '';
        setError('Firebase could not start the test' + reason + '. Check that the fictional number is configured.');
        return;
      } finally {
        setBusy(false);
      }
    }
    setChallenge(phone);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (step === 0 && (!values.name?.trim() || !values.city?.trim() || !phone)) {
      setError(firebaseTest
        ? 'Enter your name, city and the configured Firebase fictional number.'
        : 'Enter your name, city and a valid Malaysian mobile number.');
      return;
    }
    if (step === 1 && !verificationId) {
      if (challenge !== phone || (!firebaseTest && code !== dummyCode)) {
        setError('That code is incorrect. Enter the demo code to continue.');
        return;
      }
      setBusy(true);
      try {
        if (firebaseTest && !firebaseToken.current) {
          firebaseToken.current = await confirmFirebaseCode.current(code);
        }
        const result = await leadRequest('verify', firebaseTest
          ? { phone, token: firebaseToken.current }
          : { phone, code });
        if (!result.id) {
          setError(result.error || 'Could not verify the code. Please retry.');
          return;
        }
        setVerificationId(result.id);
        firebaseToken.current = null;
        confirmFirebaseCode.current = null;
        setChallenge('');
        setCode('');
      } catch (error) {
        setError(error.code === 'auth/invalid-verification-code'
          ? 'That code is incorrect. Enter the configured Firebase test code.'
          : 'Could not verify the code. Please retry.');
        return;
      } finally {
        setBusy(false);
      }
    }
    if (step < 7) {
      if (step === 6 && values.testDrive === 'Yes') {
        const testDate = new FormData(event.currentTarget).get('testDate') || '';
        setValues(previous => ({ ...previous, testDate }));
      }
      setStep(visibleScreens[screenIndex + 1].id);
      setError('');
      return;
    }
    if (verificationRequired && !verificationId) {
      setStep(1);
      setError('Verify your mobile number before submitting.');
      return;
    }
    if (!preview && !turnstileToken) {
      setError('Please complete the security check before submitting.');
      return;
    }
    submissionId.current ??= crypto.randomUUID();
    setSubmitted(true);
    setBusy(true);
    setError('');
    try {
      const submission = await leadRequest('submit', {
        id: verificationRequired ? verificationId : submissionId.current,
        values, token: turnstileToken,
      });
      if (submission.reverify) {
        setVerificationId(null);
        setSubmitted(false);
        setStep(1);
      } else if (!verificationRequired && submission.status === 400) {
        setSubmitted(false);
        submissionId.current = null;
      }
      if (!submission.saved && !submission.rows) {
        setError(submission.error || 'Could not save the enquiry. Please retry.');
        return;
      }
      setCompletion(submission);
      requestAnimationFrame(() => result.current?.focus());
    } catch {
      setError('Could not save the enquiry. Please retry.');
    } finally {
      setBusy(false);
      setTurnstileToken('');
      setTurnstileVersion(version => version + 1);
    }
  }

  return (
    <form id="buyer-enquiry" className="buyer-form local-buyer-form" onSubmit={submit}>
      <div ref={progress} className="form-progress" aria-label="Enquiry progress">
        {stages.map((label, i) => (
          <span key={label} aria-current={screen.stage === i ? 'step' : undefined} className={i <= screen.stage ? 'done' : ''}>
            <small>{String(i + 1).padStart(2, '0')}</small>{label}
          </span>
        ))}
      </div>
      {completion ? (
        <div ref={result} tabIndex={-1} className="brief-result">
          <h3>{preview ? (completion.saved ? 'Test enquiry saved.' : 'Test enquiry preview.') : 'Your enquiry has been sent.'}</h3>
          {preview && completion.rows ? <>
            <p>Lead score <strong>{completion.rows.Sheet1.lead_score} / 100</strong>. {completion.saved ? 'Both Google Sheets rows were saved.' : 'Preview only.'}</p>
            <PreviewRows rows={completion.rows} />
          </> : <p>A Motormate advisor will be in touch.</p>}
          <button type="button" onClick={() => {
            setValues(initialEnquiry());
            setCompletion(null);
            submissionId.current = null;
            setSubmitted(false);
            setVerificationId(null);
            setChallenge('');
            setCode('');
            setError('');
            setStep(0);
          }}>{preview ? 'Start a new test' : 'Start a new enquiry'}</button>
        </div>
      ) : (
        <>
          <h3 className="form-heading">{screen.title}</h3>
          <p className="form-intro">{screen.intro}</p>
          {step === 0 && model && <p className="form-note">Selected car: {[brand, model, values.variant].filter(Boolean).join(' ')}</p>}

          {step === 0 && (
            <fieldset>
              <legend className="sr-only">Your contact details</legend>
              <Field label="Full name" name="name" required autoComplete="name" {...f} />
              <Field label={firebaseTest ? 'Fictional phone number' : 'Malaysian mobile number'} name="phone" type="tel" required autoComplete="tel" placeholder={firebaseTest ? fictionalPhone : 'e.g. 012 345 6789'} {...f} />
              <div className="form-row">
                <Field label="State or territory" name="state" required options={states} {...f} />
                <Field label="Town or city" name="city" required autoComplete="address-level2" {...f} />
              </div>
              <Field label="How would you like us to reach you?" name="contact" options={['WhatsApp', 'Phone call']} required {...f} />
            </fieldset>
          )}
          {step === 1 && (
            <fieldset>
              <legend className="sr-only">SMS verification</legend>
              {verificationId ? (
                <p role="status">Mobile number {phone} is verified.</p>
              ) : (
                <>
                  <p>Mobile number {phone}</p>
                  {firebaseTest && <div ref={firebaseVerifier} />}
                  <button type="button" className="back-button demo-code-button" onClick={startVerification} disabled={busy}>
                    {challenge ? 'Request a new test code' : firebaseTest ? 'Start Firebase verification' : 'Generate demo SMS code'}
                  </button>
                  {challenge && <>
                    <p className="field-note" role="status">{firebaseTest
                      ? 'Enter the test code configured in Firebase. No SMS was sent.'
                      : <>Use <strong>{dummyCode}</strong> as your verification code.</>}</p>
                    <label htmlFor="local-otp">Verification code *
                      <input id="local-otp" inputMode="numeric" autoComplete="one-time-code" maxLength="6"
                        value={code} required onChange={event => { setCode(event.target.value); setError(''); }} />
                    </label>
                  </>}
                </>
              )}
            </fieldset>
          )}
          {step === 2 && (
            <fieldset>
              <legend className="sr-only">Your car preferences</legend>
              <CarFields prefix="buy" {...f} />
              {canSelectVariant && <Field label="Preferred variant, if known" name="variant" {...f} />}
              <div className="form-row">
                <Field label="New or certified pre-owned?" name="condition" options={['New', 'Certified Pre-Owned', 'Open to either']} required {...f} />
                <Field label="Body type" name="body" options={['Hatchback', 'Sedan', 'SUV', 'MPV', 'Pickup', 'Wagon', 'Coupe / convertible', 'Help me choose']} {...f} />
              </div>
              <div className="form-row">
                <Field label="Powertrain" name="fuel" options={['Petrol', 'Diesel', 'Hybrid', 'Plug-in hybrid', 'Fully electric', 'Help me choose']} {...f} />
                <Field label="How many seats?" name="seats" options={['2', '4–5', '6–7', '8 or more', 'Flexible']} {...f} />
              </div>
              <Field label="What will you mainly use it for?" name="use" options={['Daily commute', 'Family trips', 'Business / work', 'Long-distance travel', 'Weekend driving', 'A mix of everything']} {...f} />
            </fieldset>
          )}
          {step === 3 && (
            <fieldset>
              <legend className="sr-only">Buying timing and budget</legend>
              <label htmlFor="buying-time-choice">Your buying timeline *
                <select id="buying-time-choice" value={values.timingChoice} required onChange={event => set('timingChoice', event.target.value)}>
                  <option value="">Choose an option</option>
                  <option value="immediately">Immediately</option>
                  <option value="slider">Choose a timeframe</option>
                  <option value="stillPlanning">Still planning</option>
                  <option value="justResearching">Just researching</option>
                </select>
              </label>
              {values.timingChoice === 'slider' && (
                <div className="range-group">
                  <label htmlFor="local-timeline">When would you like to buy?<output htmlFor="local-timeline">{selectedTimeline}</output></label>
                  <input id="local-timeline" type="range" min="0" max="6" value={values.timeline}
                    aria-valuetext={selectedTimeline} onChange={event => set('timeline', event.target.value)} />
                  <div className="range-ends"><span>2 weeks</span><span>6 months</span></div>
                </div>
              )}
              <div className="range-group">
                <label htmlFor="local-budget">Your total car budget<output htmlFor="local-budget">{budgetLabel}</output></label>
                <input id="local-budget" type="range" min="30000" max="500000" step="10000"
                  value={values.budget ? Math.min(Number(values.budget), 500000) : 30000}
                  disabled={values.noLimit} onChange={event => set('budget', event.target.value)} />
                <div className="range-ends"><span>RM30,000</span><span>RM500,000</span></div>
                <label className="check-label"><input type="checkbox" checked={values.noLimit}
                  onChange={event => set('noLimit', event.target.checked)} />No upper limit</label>
                {!values.noLimit && <Field label="Enter or confirm your budget (RM)" name="budget" type="number"
                  min="30000" required placeholder="e.g. 100000" {...f} />}
                <p className="field-note">You can enter an amount above RM500,000.</p>
              </div>
            </fieldset>
          )}
          {step === 4 && (
            <fieldset>
              <legend className="sr-only">Financing and insurance</legend>
              <div className="form-row">
                <Field label="Do you need a car loan?" name="loan" options={yesNo} required {...f} />
                {values.loan === 'Yes' && <Field label="Preferred loan duration" name="loanDuration"
                  options={[...Array.from({ length: 9 }, (_, i) => i === 0 ? '1 year' : (i + 1) + ' years'), 'Not sure']} required {...f} />}
              </div>
              <div className="form-row">
                <Field label="Would you like a new-car insurance quote?" name="insuranceQuote" options={yesNo} required {...f} />
                <Field label="Do you have current car insurance?" name="currentInsurance" options={[...yesNo, 'Not sure']} required {...f} />
              </div>
              {values.currentInsurance === 'Yes' && <Field label="Current NCD, if known" name="ncd"
                options={['0%', '25%', '30%', '38.33%', '45%', '55%', 'Not sure']} {...f} />}
            </fieldset>
          )}
          {step === 5 && (
            <fieldset>
              <legend className="sr-only">Trade-in</legend>
              <Field label="Are you looking to trade in a car?" name="trade" options={yesNo} required {...f} />
              {values.trade === 'Yes' && (
                <div className="trade-fields">
                  <h4>Tell us about your current car.</h4>
                  <CarFields prefix="trade" trade {...f} />
                  <div className="form-row">
                    <Field label="Year of manufacture" name="tradeYear" type="number" min="1950" max={Number(malaysiaDate().slice(0, 4))} {...f} />
                    <Field label="Approximate mileage (km)" name="mileage" type="number" min="0" {...f} />
                  </div>
                  <Field label="Is there an outstanding loan?" name="outstanding" options={[...yesNo, 'Not sure']} {...f} />
                </div>
              )}
            </fieldset>
          )}
          {step === 6 && (
            <fieldset>
              <legend className="sr-only">Test drive</legend>
              <Field label="Request a test drive?" name="testDrive" options={yesNo} required {...f} />
              {values.testDrive === 'Yes' && <Field label="Preferred test-drive date" name="testDate" type="date"
                min={malaysiaDate()} {...f} />}
            </fieldset>
          )}
          {step === 7 && (
            <fieldset>
              <legend className="sr-only">Must-have features and enquiry review</legend>
              <label htmlFor="local-buyer-notes">Any must-have features or requests?
                <textarea id="local-buyer-notes" value={values.notes || ''} readOnly={submitted} rows="3" maxLength="1000"
                  placeholder="e.g. 360° camera or a specific colour" onChange={event => set('notes', event.target.value)} />
              </label>
              <dl className="lead-review">
                <div><dt>Contact</dt><dd>{values.name} · {phone} · {values.contact}</dd></div>
                <div><dt>Location</dt><dd>{values.city}, {values.state}</dd></div>
                <div><dt>Vehicle</dt><dd>{[brand, model, values.variant, values.condition].filter(Boolean).join(' · ')}</dd></div>
                <div><dt>Timing and budget</dt><dd>{timingLabels[values.timingChoice]} · {budgetLabel}</dd></div>
                <div><dt>Finance / insurance / trade-in</dt><dd>{values.loan} / {values.insuranceQuote} / {values.trade}</dd></div>
                <div><dt>Test drive</dt><dd>{values.testDrive}{values.testDrive === 'Yes' && values.testDate ? ' · ' + values.testDate : ''}</dd></div>
              </dl>
            </fieldset>
          )}

          {step === 7 && !preview && <LeadTurnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} version={turnstileVersion} />}
          {error && <p className="lead-error" role="alert">{error}</p>}
          <p className="form-note">Motormate will use your details to respond to this enquiry.</p>
          <div className="form-buttons">
            {step > 0 && !submitted && <button type="button" disabled={busy} className="back-button" onClick={() => { setStep(visibleScreens[screenIndex - 1].id); setError(''); }}>
              <Arrow direction="left" /> Back
            </button>}
            {(step !== 1 || challenge || verificationId) && <button type="submit" disabled={busy} className="button dark">
              {busy ? 'Please wait…' : step === 7 ? submitted ? 'Retry save' : 'Submit enquiry' : step === 1 && !verificationId ? 'Verify and continue' : 'Continue'}<span className="button-dot"><Arrow direction={step === 7 ? 'up-right' : 'right'} /></span>
            </button>}
          </div>
        </>
      )}
    </form>
  );
}
