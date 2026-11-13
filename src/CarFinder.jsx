import React, { lazy, Suspense, useEffect, useState } from 'react';
import Arrow from './Arrow';
import SiteHeader from './SiteHeader';
import { affordableCarPrice, loanEstimate, roadTax, runningCostEstimate } from './carCosts';
import updates from '../catalogue/market-updates.json';
import './car-finder.css';

const MarketReport = lazy(() => import('./MarketReport'));

const taxSource = 'https://www.jpj.gov.my/en/rate-calculation-guide-lkm/';
const toolLinks = [
  ['Car loan', 'loan'],
  ['Road tax', 'road-tax'],
  ['Running costs', 'ownership'],
  ['New & Upcoming', 'launches'],
  ['Market rankings', 'market'],
];
const base = '/cars/';
const integer = new Intl.NumberFormat('en-MY');
const currency = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const rm = value => value == null ? '—' : currency.format(value);
const unit = (value, suffix) => value == null ? null : integer.format(value) + ' ' + suffix;
const loanDefaults = { down: '10', rate: '2.5', years: '9', method: 'flat' };
const taxDefaults = { region: 'west', category: 'saloon', powertrain: 'ice', capacity: '' };
const carName = model => model.brand + ' ' + model.name;
const trimName = trim => trim.year + ' ' + trim.name;

function href(params, hash = '') {
  return base + '?' + new URLSearchParams(params) + hash;
}

function quote(model, trim) {
  const query = new URLSearchParams({ brand: model.brand, model: model.name });
  if (trim) query.set('variant', trimName(trim));
  return '/?' + query + '#buyer-enquiry';
}

function PriceRange({ model }) {
  const prices = model.variants.map(trim => trim.price).filter(price => price != null);
  if (!prices.length) return 'Price to be confirmed';
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum ? rm(minimum) : rm(minimum) + ' – ' + rm(maximum);
}

function Photo({ model, index = 0 }) {
  const photo = model.photos?.[index];
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return <div className="cf-photo cf-photo-empty"><span>Photo unavailable</span></div>;
  return <div className="cf-photo">
    <img src={photo.url} alt={carName(model) + ' exterior, view ' + (index + 1)}
      loading="lazy" onError={() => setFailed(true)} />
  </div>;
}

function NumericField({ label, value, change, min, max, step = '1' }) {
  return <label>{label}<input type="number" inputMode="decimal" min={min} max={max}
    step={step} value={value} onChange={event => change(event.target.value)} /></label>;
}

function ChoiceField({ label, value, change, options }) {
  return <label>{label}<select value={value} onChange={event => change(event.target.value)}>
    {Object.entries(options).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
  </select></label>;
}

const regions = { west: 'Peninsular Malaysia', east: 'Sabah / Sarawak' };
const categories = { saloon: 'Private saloon', company: 'Company saloon', other: 'Non-saloon' };

function LoanInputs({ values, set }) {
  const change = key => value => set(previous => ({ ...previous, [key]: value }));
  return <>
    <NumericField label="Down payment (%)" value={values.down} change={change('down')} min="0" max="100" step=".1" />
    <NumericField label="Annual interest (%)" value={values.rate} change={change('rate')} min="0" max="100" step=".01" />
    <NumericField label="Loan tenure (years)" value={values.years} change={change('years')} min="1" max="9" />
    <ChoiceField label="Interest method" value={values.method} change={change('method')}
      options={{ flat: 'Flat rate', reducing: 'Reducing balance' }} />
  </>;
}

function LoanCalculator({ trim }) {
  const [values, set] = useState(loanDefaults);
  const [price, setPrice] = useState(trim?.price ?? '');
  const [mode, setMode] = useState('payment');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const byBudget = mode === 'budget';
  const maximum = byBudget ? affordableCarPrice(monthlyBudget, values) : null;
  const carPrice = byBudget ? maximum : price;
  const estimate = loanEstimate(carPrice, values);
  const emptyMessage = byBudget
    ? Number(values.down) === 100 ? 'Enter a down payment below 100% to estimate a financed car price.'
      : monthlyBudget ? 'Check your monthly budget and loan terms.' : 'Enter your monthly budget to see your maximum car price.'
    : price ? 'Check the car price and loan terms.' : 'Enter a car price to see your estimate.';
  return <section className="cf-tool" id="loan">
    <h2><span className="heading-accent">Car loan</span> <em>calculator.</em></h2>
    <div className="cf-loan-inputs">
      <div className="cf-toggles cf-loan-modes" role="group" aria-label="Loan calculator mode">
        <button className="cf-button" type="button" aria-pressed={!byBudget} onClick={() => setMode('payment')}>Monthly payment</button>
        <button className="cf-button" type="button" aria-pressed={byBudget} onClick={() => setMode('budget')}>Budget → Car price</button>
      </div>
      <div className="cf-fields">
        {byBudget ? <NumericField label="Monthly budget (RM)" value={monthlyBudget} change={setMonthlyBudget} min="1" step=".01" />
          : <NumericField label="Car price (RM)" value={price} change={setPrice} min="1" />}
        <LoanInputs values={values} set={set} />
      </div>
    </div>
    <div className="cf-result" aria-live="polite">
      <span className="eyebrow">{byBudget ? 'Estimated maximum car price' : 'Estimated monthly payment'}</span>
      {estimate ? <strong>{rm(byBudget ? maximum : estimate.monthly)}</strong> : <p>{emptyMessage}</p>}
      {estimate && <dl>
        <div><dt>{byBudget ? 'Monthly payment' : 'Car price'}</dt><dd>{rm(byBudget ? estimate.monthly : Number(carPrice))}</dd></div>
        <div><dt>Down payment</dt><dd>{rm(estimate.downPayment)}</dd></div>
        <div><dt>Loan amount</dt><dd>{rm(estimate.principal)}</dd></div>
        <div><dt>Total interest</dt><dd>{rm(estimate.interest)}</dd></div>
        <div><dt>Total loan repayment</dt><dd>{rm(estimate.total)}</dd></div>
        <div><dt>Total paid including deposit</dt><dd>{rm(estimate.paid)}</dd></div>
      </dl>}
      {maximum != null && <a className="button orange cf-budget-link" href={href({ budget: maximum }, '#car-results')}>
        Find cars within my budget <span className="button-dot"><Arrow /></span>
      </a>}
    </div>
    <p className="cf-note">Use the rate and interest method quoted by your lender. Estimates exclude insurance, fees and running costs.</p>
  </section>;
}

function TaxCalculator({ trim }) {
  const [values, set] = useState(() => ({
    ...taxDefaults,
    category: trim?.roadClass ?? taxDefaults.category,
    powertrain: trim?.fuel === 'BEV' ? 'ev' : 'ice',
    capacity: trim?.cc ?? trim?.motorKW ?? '',
    fuel: trim?.fuel,
  }));
  const change = key => value => set(previous => ({ ...previous, [key]: value }));
  const ev = values.powertrain === 'ev';
  const estimate = roadTax(values);
  return <section className="cf-tool" id="road-tax">
    <h2><span className="heading-accent">Road tax</span> <em>calculator.</em></h2>
    <div className="cf-fields">
      <ChoiceField label="Powertrain" value={values.powertrain}
        change={powertrain => set(previous => ({ ...previous, powertrain, capacity: '' }))}
        options={{ ice: 'Petrol, diesel or hybrid', ev: 'Battery electric' }} />
      <NumericField label={ev ? 'Motor power (kW)' : 'Engine capacity (cc)'}
        value={values.capacity} change={change('capacity')} min="1" step={ev ? '.1' : '1'} />
      {!ev && <>
        <ChoiceField label="Registration region" value={values.region} change={change('region')} options={regions} />
        <ChoiceField label="Vehicle class" value={values.category} change={change('category')} options={categories} />
      </>}
    </div>
    <div className="cf-result" aria-live="polite"><span className="eyebrow">Estimated annual road tax</span>
      {estimate != null ? <strong>{rm(estimate)}</strong>
        : <p>{values.capacity ? 'Estimate unavailable for these inputs.' : ev ? 'Enter the motor power to see your estimate.' : 'Enter the engine capacity to see your estimate.'}</p>}</div>
    <p className="cf-note">For private passenger vehicles. Confirm the class and rated motor output on your registration documents. <a href={taxSource}>JPJ rate guide</a></p>
  </section>;
}

const fuelRate = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 });
const releaseDate = value => new Intl.DateTimeFormat('en-MY', {
  dateStyle: 'medium', timeZone: 'UTC',
}).format(new Date(value + 'T00:00:00Z'));
const fuelPeriod = releaseDate(updates.fuel.from) + ' – ' + releaseDate(updates.fuel.through);

function FuelPricePanel() {
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return <section className="cf-running-section" aria-labelledby="fuel-price-title">
    <h2 id="fuel-price-title"><span className="heading-accent">Fuel</span> <em>prices.</em></h2>
    <p>{fuelPeriod} · {today > updates.fuel.through ? 'Past price period' : 'MOF price bulletin'}</p>
    <dl className="cf-fuel-prices">{updates.fuel.rates.map(item => <div key={item.id}>
      <dt>{item.name}</dt>
      <dd>{fuelRate.format(item.price)} <small>/ litre</small></dd>
      {item.previous != null && <dd className="cf-fuel-change">Down {fuelRate.format(item.previous - item.price)}</dd>}
    </div>)}</dl>
    <p className="cf-note">Subsidised rates depend on eligibility. <a href={updates.fuel.source}>Ministry of Finance bulletin</a></p>
  </section>;
}

function OwnershipCosts({ trim }) {
  const [mode, setMode] = useState(trim?.fuel === 'BEV' ? 'charging' : 'fuel');
  const [distance, setDistance] = useState('15000');
  const [consumption, setConsumption] = useState(trim?.consumption ?? '');
  const [preset, setPreset] = useState('');
  const [rate, setRate] = useState('');
  const [region, setRegion] = useState('west');
  const [manualTax, setManualTax] = useState(null);
  const [insurance, setInsurance] = useState('');
  const [service, setService] = useState('');
  const charging = mode === 'charging';
  const trimTax = trim ? roadTax({
    region, category: trim.roadClass, fuel: trim.fuel,
    powertrain: trim.fuel === 'BEV' ? 'ev' : 'ice', capacity: trim.cc ?? trim.motorKW,
  }) : null;
  const tax = manualTax ?? trimTax ?? '';
  const estimate = runningCostEstimate({ distance, consumption, rate, tax, insurance, service });
  const changeMode = value => {
    if (value === mode) return;
    setMode(value);
    setConsumption(value === 'fuel' ? trim?.consumption ?? '' : '');
    setPreset('');
    setRate('');
  };
  const chooseFuel = value => {
    setPreset(value);
    if (value) setRate(String(updates.fuel.rates.find(item => item.id === value).price));
  };
  return <div className="cf-section cf-standalone-tool">
    <section className="cf-tool cf-ownership">
      <h2><span className="heading-accent">Ownership</span> <em>costs.</em></h2>
      <div>
        <div className="cf-toggles cf-loan-modes" role="group" aria-label="Energy cost type">
          <button className="cf-button" type="button" aria-pressed={!charging} onClick={() => changeMode('fuel')}>Fuel</button>
          <button className="cf-button" type="button" aria-pressed={charging} onClick={() => changeMode('charging')}>Charging</button>
        </div>
        <div className="cf-fields">
          <NumericField label="Annual distance (km)" value={distance} change={setDistance} min="0" />
          <NumericField label={charging ? 'Consumption (kWh/100 km)' : 'Consumption (L/100 km)'} value={consumption} change={setConsumption} min=".01" step=".01" />
          {!charging && <ChoiceField label="Fuel price preset" value={preset} change={chooseFuel}
            options={{ '': 'Enter your own price', ...Object.fromEntries(updates.fuel.rates.map(item => [item.id, item.name + ' · ' + fuelRate.format(item.price)])) }} />}
          <NumericField label={charging ? 'Charging rate (RM/kWh)' : 'Fuel price (RM/litre)'} value={rate}
            change={value => { setRate(value); setPreset(''); }} min="0" step=".01" />
          {trim && <ChoiceField label="Road tax region" value={region} change={value => { setRegion(value); setManualTax(null); }} options={regions} />}
          <NumericField label="Annual road tax (RM)" value={tax} change={setManualTax} min="0" step=".01" />
          <NumericField label="Annual insurance (RM, optional)" value={insurance} change={setInsurance} min="0" step=".01" />
          <NumericField label="Annual servicing (RM, optional)" value={service} change={setService} min="0" step=".01" />
        </div>
        {preset && <p className="cf-note">Selected fuel rate applies to {fuelPeriod}.</p>}
        <p className="cf-note"><a href={href({ tool: 'road-tax' })} target="_blank" rel="noopener">Check annual road tax</a></p>
      </div>
      <div className="cf-result" aria-live="polite">
        <span className="eyebrow">Estimated monthly running cost</span>
        {estimate ? <><strong>{rm(estimate.monthly)}</strong><dl>
          <div><dt>{charging ? 'Charging' : 'Fuel'} per year</dt><dd>{rm(estimate.energy)}</dd></div>
          <div><dt>Road tax</dt><dd>{rm(estimate.roadTax)}</dd></div>
          <div><dt>Insurance</dt><dd>{insurance === '' ? '—' : rm(estimate.premium)}</dd></div>
          <div><dt>Servicing</dt><dd>{service === '' ? '—' : rm(estimate.servicing)}</dd></div>
          <div><dt>Estimated annual total</dt><dd>{rm(estimate.annual)}</dd></div>
        </dl></> : <p>Enter distance, consumption, a rate and annual road tax to see your estimate.</p>}
      </div>
      <p className="cf-note">Blank optional costs are excluded. The estimate covers running costs and excludes financing and depreciation. For a plug-in hybrid, add the two energy subtotals for the kilometres driven on fuel and electricity. Include annual fixed costs once.</p>
    </section>
    <FuelPricePanel />
  </div>;
}

function LaunchUpdates() {
  const [status, setStatus] = useState('Launched');
  return <section className="cf-section cf-running-section">
    <h1><span className="heading-accent">New</span> <em>&amp; upcoming.</em></h1>
    <p>Selected Malaysian launches and manufacturer announcements. Checked {updates.launchesChecked}.</p>
    <div className="cf-toggles cf-loan-modes" role="group" aria-label="Launch status">
      {['Launched', 'Upcoming'].map(value => <button className="cf-button" key={value} type="button"
        aria-pressed={status === value} onClick={() => setStatus(value)}>{value}</button>)}
    </div>
    <div className="cf-launch-grid">{updates.launches.filter(item => item.status === status).map(item => <article key={item.name}>
      <p className="eyebrow">{item.date}</p>
      <h2>{item.name}</h2>
      <p>{item.summary}</p>
      {item.price && <p className="cf-launch-price">{item.price}</p>}
      <div className="cf-actions">
        {item.model && <a className="cf-button cf-primary" href={href({ model: item.model })}>View car</a>}
        <a className="text-link" href={item.source}>Manufacturer announcement <Arrow /></a>
      </div>
    </article>)}</div>
  </section>;
}

const equipmentFields = [
  ['Drive', 'Drivetrain'],
  ['Air conditioning', 'First-row A/C'],
  ['Cruise control', 'Cruise Control'],
  ['Emergency braking', 'Autonomous Emergency Braking (AEB)'],
  ['Curtain airbags', 'Side Curtain Airbag'],
  ['Parking camera', 'Driver Assistance Camera'],
  ['Phone integration', 'Mobile Phone Interconnection/Mapping'],
];

const specs = [
  ['Body type', ({ model }) => model.body],
  ['Powertrain', ({ trim }) => trim.fuel],
  ['Seats', ({ trim }) => trim.seats],
  ['Engine capacity', ({ trim }) => unit(trim.cc, 'cc')],
  ['Power as listed', ({ trim }) => unit(trim.power, 'PS')],
  ['Electric motor power', ({ trim }) => unit(trim.motorKW, 'kW')],
  ['Torque', ({ trim }) => unit(trim.torque, 'Nm')],
  ['Transmission', ({ trim }) => trim.transmission],
  ['Combined fuel consumption', ({ trim }) => unit(trim.consumption, 'L/100 km')],
  ['Battery capacity', ({ trim }) => unit(trim.battery, 'kWh')],
  ['Listed EV range', ({ trim }) => unit(trim.range, 'km')],
  ...equipmentFields.map(([label, key]) => [label, ({ trim }) => trim.specs?.[key]]),
];


function comparisonUrl(ids) {
  return href({ compare: ids.join(',') });
}

function defaultTrim(model) {
  return model.variants.find(trim => trim.status === 'Available for sale' && trim.price != null)
    ?? model.variants.find(trim => trim.price != null)
    ?? model.variants[0];
}

function Compare({ models, entries, selected, toggle, clear }) {
  const [addModel, setAddModel] = useState('');
  const available = models.map(model => ({
    model,
    trims: model.variants.filter(trim => !selected.includes(trim.id)),
  })).filter(group => group.trims.length);
  const chosen = available.find(group => group.model.id === addModel);
  const [hide, setHide] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [pinned, setPinned] = useState('');
  const [loan, setLoan] = useState(loanDefaults);
  const [region, setRegion] = useState('west');
  const [shareStatus, setShareStatus] = useState('');
  const columns = selected.map(id => {
    const entry = entries.get(id);
    return { ...entry, finance: loanEstimate(entry.trim.price, loan) };
  });
  const reference = Math.max(0, selected.indexOf(pinned));
  const rows = [
    ['OTR price without insurance', ({ trim }) => rm(trim.price)],
    ...specs,
    ...(showAll ? [...new Set(columns.flatMap(({ trim }) => Object.keys(trim.specs || {})))]
      .filter(label => !specs.some(([name]) => name === label)
        && !equipmentFields.some(([, key]) => key === label) && !label.includes('Price'))
      .map(label => [label, ({ trim }) => trim.specs?.[label]]) : []),
    ['Estimated monthly payment', ({ finance }) => rm(finance?.monthly)],
    ['Down payment', ({ finance }) => rm(finance?.downPayment)],
    ['Total loan repayment', ({ finance }) => rm(finance?.total)],
    ['Total paid including deposit', ({ finance }) => rm(finance?.paid)],
    ['Estimated annual road tax', ({ trim }) => rm(roadTax({
      region, category: trim.roadClass, fuel: trim.fuel, powertrain: trim.fuel === 'BEV' ? 'ev' : 'ice',
      capacity: trim.cc ?? trim.motorKW,
    }))],
  ];
  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(comparisonUrl(selected), location.origin).href);
      setShareStatus('Link copied');
    } catch {
      setShareStatus('Copy the comparison link from the address bar.');
    }
  }
  return <section className="cf-section cf-comparison">
    <div className="cf-title-row cf-comparison-title">
      <div><h1><span className="heading-accent">Compare</span> <em>cars.</em></h1>
        <p>Add up to four variants to see their specs and costs side by side.</p></div>
      {selected.length > 0 && <div className="cf-actions">
        <button className="cf-button" type="button" onClick={() => {
          setAddModel('');
          setPinned('');
          setShareStatus('Comparison cleared.');
          clear();
        }}>Clear all</button>
        <button className="button dark" type="button" onClick={share}>
          Copy link <span className="button-dot"><Arrow /></span>
        </button>
      </div>}
    </div>
    <p className="cf-share-status" role="status">{shareStatus}</p>
    <div className="cf-fields cf-compare-picker">
      <label>Add a car<select value={chosen?.model.id ?? ''} disabled={selected.length >= 4}
        onChange={event => setAddModel(event.target.value)}>
        <option value="">Choose a make and model</option>
        {available.map(({ model }) => <option key={model.id} value={model.id}>{carName(model)}</option>)}
      </select></label>
      <label>Variant to compare<select value="" disabled={!chosen || selected.length >= 4}
        onChange={event => {
          if (!event.target.value) return;
          toggle(event.target.value);
          setAddModel('');
        }}>
        <option value="">Choose a variant</option>
        {chosen?.trims.map(trim => <option key={trim.id} value={trim.id}>{trimName(trim)} · {rm(trim.price)}</option>)}
      </select></label>
    </div>
    {columns.length === 0 ? <p className="cf-empty">Add a variant to start comparing.</p> : <>
      <details className="cf-cost-settings">
        <summary>Loan and road tax settings</summary>
        <div className="cf-fields">
          <ChoiceField label="Road tax region" value={region} change={setRegion} options={regions} />
          <LoanInputs values={loan} set={setLoan} />
        </div>
      </details>
      <div className="cf-toggles" role="group" aria-label="Specification display">
        <button type="button" className="cf-button" aria-pressed={hide} onClick={() => setHide(!hide)}>Hide identical rows</button>
        <button type="button" className="cf-button" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>Show full specifications</button>
        <button type="button" className="cf-button" aria-pressed={highlight} onClick={() => setHighlight(!highlight)}>Highlight differences</button>
      </div>
      <div className="cf-table-scroll" tabIndex="0" aria-label="Variant comparison">
        <table className="cf-table"><thead><tr><th scope="col">Specification</th>
          {columns.map(({ model, trim }, index) => <th scope="col" key={trim.id}>
            <Photo model={model} /><a href={href({ model: model.id, trim: trim.id })}>{carName(model)}</a>
            <span>{trimName(trim)}</span>
            <div className="cf-actions"><button className="cf-button" type="button" onClick={() => setPinned(trim.id)}
              aria-pressed={index === reference}>{index === reference ? 'Reference' : 'Pin'}</button>
              <button className="cf-button" type="button" onClick={() => toggle(trim.id)}>Remove</button></div>
          </th>)}</tr></thead>
          <tbody>{rows.map(([label, format]) => {
            const values = columns.map(format);
            const known = values.every(value => value != null && value !== '—');
            if (hide && columns.length > 1 && known && values.every(value => value === values[reference])) return null;
            return <tr key={label}><th scope="row">{label}</th>
              {values.map((value, index) => <td key={columns[index].trim.id}
                className={highlight && value != null && value !== '—' && values[reference] != null && values[reference] !== '—' && value !== values[reference] ? 'cf-different' : undefined}>
                {value ?? '—'}
              </td>)}</tr>;
          })}
          <tr><th scope="row">Enquiry</th>{columns.map(({ model, trim }) =>
            <td key={trim.id}><a className="cf-button cf-primary" href={quote(model, trim)}>Get a quote</a></td>)}</tr>
          </tbody></table>
      </div>
      <p className="cf-note">A dash indicates missing source data or an unavailable estimate.</p>
    </>}
  </section>;
}

function ModelDetail({ models, model, trim }) {
  const reference = trim ?? defaultTrim(model);
  const suggestions = models.filter(candidate => candidate.id !== model.id && candidate.body === model.body)
    .map(candidate => ({ model: candidate, trim: defaultTrim(candidate) }))
    .filter(item => item.trim)
    .sort((a, b) => Math.abs((a.trim.price ?? Infinity) - (reference.price ?? 0))
      - Math.abs((b.trim.price ?? Infinity) - (reference.price ?? 0)))
    .slice(0, 3);
  const compareWith = option => comparisonUrl([option.id]);
  const [photoIndex, setPhotoIndex] = useState(0);
  return <section className="cf-section">
    <p className="cf-note"><a href={base}>Car finder</a> / {carName(model)}</p>
    <div className="cf-detail">
      <div><Photo key={photoIndex} model={model} index={photoIndex} />
        {model.photos?.length > 0 && <div className="cf-photo-controls">
          {model.photos.map((photo, index) => <button type="button" className="cf-button" key={photo.url}
            aria-pressed={index === photoIndex} onClick={() => setPhotoIndex(index)}>Photo {index + 1}</button>)}
        </div>}
      </div>
      <div><p className="cf-rank">#{model.rank} by Malaysian registrations</p>
        <h1>{carName(model)}</h1><p>{model.body} · {integer.format(model.registrations)} registrations</p>
        <p className="cf-price">{trim ? rm(trim.price) : <PriceRange model={model} />}</p>
        <p className="cf-note">OTR without insurance, where listed</p>
        <div className="cf-actions"><a className="cf-button cf-primary" href={quote(model, trim)}>Get a quote</a>
          <a className="cf-button" href={compareWith(reference)}>Compare with another car</a>
          <a className="cf-button" href={href({ tool: 'ownership', model: model.id, trim: reference.id })}>Running costs</a>
          <a className="cf-button" href="#loan">Car loan</a><a className="cf-button" href="#road-tax">Road tax</a></div>
      </div>
    </div>
    <h2>Variants</h2>
    <div className="cf-variants">{model.variants.map(option =>
      <article key={option.id} className={trim?.id === option.id ? 'cf-current' : ''}>
        <div><a href={href({ model: model.id, trim: option.id })}>{trimName(option)}</a>
          {option.status && option.status !== 'Available for sale' && <small>{option.status}</small>}</div>
        <span>{rm(option.price)}</span>
        <a className="cf-button" href={compareWith(option)}>Compare</a>
      </article>)}</div>
    {suggestions.length > 0 && <section className="cf-suggested">
      <h2>Compare with similar cars</h2>
      <div className="cf-suggestions">{suggestions.map(({ model: other, trim: option }) =>
        <a key={other.id} className="cf-button" href={comparisonUrl([reference.id, option.id])}>
          vs {carName(other)} <Arrow />
        </a>)}</div>
    </section>}
    {trim && <section><h2>{trimName(trim)} specifications</h2><dl className="cf-specs">
      {specs.map(([label, format]) => <div key={label}><dt>{label}</dt><dd>{format({ model, trim }) ?? '—'}</dd></div>)}
    </dl>
    {trim.specs && <details className="cf-full-specs"><summary>Full specifications</summary><dl className="cf-specs">
      {Object.entries(trim.specs).filter(([key]) => !key.includes('Price')).map(([key, value]) =>
        <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
    </dl></details>}
    </section>}
    <div className="cf-tools">
      <LoanCalculator key={'loan-' + trim?.id} trim={trim} /><TaxCalculator key={'tax-' + trim?.id} trim={trim} />
    </div>
    <p className="cf-note">Catalogue data and linked photos from <a href={model.source}>BitAuto Malaysia</a>.</p>
  </section>;
}

function Finder({ models }) {
  const [query, setQuery] = useState('');
  const [body, setBody] = useState('');
  const [fuel, setFuel] = useState('');
  const [seats, setSeats] = useState('');
  const [budget, setBudget] = useState(() => {
    const limit = new URLSearchParams(window.location.search).get('budget');
    return /^\d+$/.test(limit ?? '') && Number.isSafeInteger(Number(limit)) && Number(limit) > 0 ? limit : '';
  });
  const [sort, setSort] = useState('rank');
  useEffect(() => {
    if (location.hash === '#car-results') document.getElementById('car-results')?.scrollIntoView();
  }, []);
  const pageSize = 9;
  const [page, setPage] = useState(0);
  const start = page * pageSize;
  const goToPage = next => {
    setPage(next);
    document.getElementById('cf-model-results')?.scrollIntoView({ block: 'start' });
  };
  const updateFilter = setter => value => {
    setter(value);
    setPage(0);
  };
  const visible = models.filter(model =>
    carName(model).toLowerCase().includes(query.trim().toLowerCase())
    && (!body || model.body === body)
    && model.variants.some(trim => (!fuel || trim.fuel === fuel)
      && (!seats || trim.seats === Number(seats))
      && (!budget || (trim.price != null && trim.price <= Number(budget)))));
  const lowest = model => Math.min(...model.variants.map(trim => trim.price ?? Infinity));
  if (sort === 'price') visible.sort((a, b) => lowest(a) - lowest(b));
  return <>
    <section className="cf-hero">
      <div className="hero-glow" aria-hidden="true" />
      <img className="hero-symbol" src="/assets/motormate-symbol-transparent.svg" alt="" />
      <div className="cf-hero-copy">
        <p className="hero-overline"><span className="status-dot" /> MALAYSIA · 2026 YEAR TO DATE</p>
        <h1><span>Find your next car.</span><em>Compare your shortlist.</em></h1>
        <p>Explore Malaysia’s 20 most registered models through September, compare trims and estimate ownership costs.</p>
        <a className="button dark cf-hero-action" href="#car-results">Browse cars <span className="button-dot"><Arrow direction="down" /></span></a>
      </div>
    </section>
    <section className="cf-section" id="car-results" aria-label="Browse cars">
      <section className="cf-search contact" aria-labelledby="cf-search-title">
        <h2 id="cf-search-title"><span className="heading-accent">What fits</span><br /><em>your drive?</em></h2>
        <div className="cf-fields cf-filter">
        <label>Search by make or model<input type="search" value={query} onChange={event => updateFilter(setQuery)(event.target.value)} placeholder="e.g. Honda HR-V" /></label>
        <ChoiceField label="Body type" value={body} change={updateFilter(setBody)} options={{ '': 'Any body type', ...Object.fromEntries([...new Set(models.map(model => model.body))].map(value => [value, value])) }} />
        <ChoiceField label="Powertrain" value={fuel} change={updateFilter(setFuel)} options={{ '': 'Any powertrain', Petrol: 'Petrol', Diesel: 'Diesel', HEV: 'Hybrid', PHEV: 'Plug-in hybrid', BEV: 'Electric' }} />
        <ChoiceField label="Seats" value={seats} change={updateFilter(setSeats)} options={{ '': 'Any seating', 2: '2 seats', 5: '5 seats', 7: '7 seats' }} />
        <NumericField label="Maximum price (RM)" value={budget} change={updateFilter(setBudget)} min="0" />
        <ChoiceField label="Sort by" value={sort} change={updateFilter(setSort)} options={{ rank: 'Registration rank', price: 'Lowest starting price' }} />
        </div>
      </section>
      <div className="cf-title-row cf-results-title" id="cf-model-results"><h2><span className="heading-accent">Top</span> <em>models.</em></h2><span role="status">{visible.length ? `${start + 1}–${Math.min(start + pageSize, visible.length)} of ${visible.length} models` : '0 models'}</span></div>
      {visible.length === 0 && <p className="cf-empty">No models match these filters.</p>}
      <div className="cf-grid">{visible.slice(start, start + pageSize).map(model => <article className="cf-card" key={model.id}>
        <a className="cf-card-photo" href={href({ model: model.id })} aria-label={'View ' + carName(model)}>
          <Photo model={model} />
        </a>
        <div className="cf-card-content">
          <div className="eyebrow cf-model-rank"><span className="status-dot" aria-hidden="true" /> #{model.rank} · {integer.format(model.registrations)} registrations</div>
          <h3><a href={href({ model: model.id })}>{carName(model)}</a></h3>
          <p>{model.body} · {model.variants.length} {model.variants.length === 1 ? 'variant' : 'variants'}</p>
          <strong><PriceRange model={model} /></strong>
          <a className="text-link cf-card-link" href={href({ model: model.id })}>View variants <Arrow /></a>
        </div>
      </article>)}</div>
      {visible.length > pageSize && <nav className="cf-load-more" aria-label="Car results pages">
        <button className="cf-button" type="button" disabled={page === 0} onClick={() => goToPage(page - 1)}>Previous</button>
        <button className="cf-button cf-primary" type="button" disabled={start + pageSize >= visible.length}
          onClick={() => goToPage(page + 1)}>Next cars <Arrow /></button>
      </nav>}
    </section>
  </>;
}

export default function CarFinder() {
  const [models, setModels] = useState(null);
  const [error, setError] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const params = new URLSearchParams(window.location.search);
  const comparing = params.has('compare');
  useEffect(() => {
    document.title = 'Car Finder | MotorMate';
    const controller = new AbortController();
    fetch('/api/catalogue', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Catalogue unavailable');
        return response.json();
      })
      .then(records => setModels(records))
      .catch(reason => { if (reason.name !== 'AbortError') setError(true); });
    const syncSelection = () => {
      const share = new URLSearchParams(location.search).get('compare');
      try {
        if (share != null) {
          const ids = share.split(',').filter(Boolean);
          setSelectedIds(ids);
          sessionStorage.setItem('motormate-comparison', JSON.stringify(ids));
        } else {
          const saved = JSON.parse(sessionStorage.getItem('motormate-comparison') || '[]');
          setSelectedIds(Array.isArray(saved) ? saved : []);
        }
      } catch {
        setSelectedIds([]);
      }
    };
    syncSelection();
    window.addEventListener('popstate', syncSelection);
    return () => {
      controller.abort();
      window.removeEventListener('popstate', syncSelection);
    };
  }, []);
  const entries = new Map(models?.flatMap(model => model.variants.map(trim => [trim.id, { model, trim }])));
  const selected = [...new Set(selectedIds)].filter(id => entries.has(id)).slice(0, 4);
  const saveSelection = next => {
    setSelectedIds(next);
    try { sessionStorage.setItem('motormate-comparison', JSON.stringify(next)); } catch {}
    if (comparing) history.replaceState(null, '', comparisonUrl(next));
  };
  const toggle = id => saveSelection(selected.includes(id)
    ? selected.filter(item => item !== id)
    : [...selected, id].slice(0, 4));
  const model = models?.find(item => item.id === params.get('model'));
  const trim = model?.variants.find(item => item.id === params.get('trim'));
  const tool = params.get('tool');
  return <div className="car-finder">
    <SiteHeader tools={toolLinks} activeTool={tool} />
    <main className="cf-main">
      {comparing && models ? <Compare models={models} entries={entries} selected={selected} toggle={toggle} clear={() => saveSelection([])} />
        : tool === 'loan' ? <div className="cf-section cf-standalone-tool"><LoanCalculator /></div>
        : tool === 'road-tax' ? <div className="cf-section cf-standalone-tool"><TaxCalculator /></div>
        : tool === 'ownership' ? (params.has('model') && !models && !error
          ? <p className="cf-section" role="status">Loading vehicle details…</p>
          : <OwnershipCosts key={trim?.id ?? 'standalone'} trim={trim} />)
        : tool === 'launches' ? <LaunchUpdates />
        : tool === 'market' ? <Suspense fallback={<p className="cf-section">Loading market report…</p>}><MarketReport cars={models ?? []} /></Suspense>
        : model ? <ModelDetail models={models} model={model} trim={trim} />
        : models ? <Finder models={models} />
        : <p className="cf-section" role="status">{error ? 'The catalogue could not be loaded.' : 'Loading cars…'}</p>}
    </main>
    {!comparing && !tool && selected.length > 0 && <aside className="cf-compare-bar" aria-label="Selected variants">
      <span>{selected.length} of 4 variants selected</span>
      <a href={comparisonUrl(selected)} className="cf-button cf-primary">Compare cars</a>
    </aside>}
  </div>;
}
