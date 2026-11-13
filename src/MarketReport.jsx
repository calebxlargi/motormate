import React, { useState } from 'react';
import Arrow from './Arrow';
import { exportMarketRows } from './marketExport';
import { fuelLabels, groupMarketFuels } from './marketFuel';
import data from '../catalogue/market-registrations.json';
import './market-report.css';

const popularity = 'https://data.gov.my/dashboard/car-popularity';
const transactions = 'https://data.gov.my/data-catalogue/registration_transactions_car';
const maaSales = [
  ['Passenger vehicles', 64835, 53352, 564919, 536122],
  ['Commercial vehicles', 4774, 5138, 37714, 43214],
  ['Total industry volume', 69609, 58490, 602633, 579336],
];
const maaRelease = 'https://maa.org.my/pdf/2026/pressreleaseforsep2026.pdf';
const number = new Intl.NumberFormat('en-MY');
const percent = new Intl.NumberFormat('en-MY', { style: 'percent', maximumFractionDigits: 1 });
const month = (period, long = false) => new Intl.DateTimeFormat('en-MY', {
  month: long ? 'long' : 'short', year: long ? 'numeric' : undefined, timeZone: 'UTC',
}).format(new Date(period + '-01T00:00:00Z'));
const maaHistorySource = 'https://www.dosm.gov.my/uploads/release-content/file_20261016113555.pdf';
const maaMonthly = [
  [61393, 3966], [49634, 3703], [59498, 4011], [69077, 4272], [58037, 3945],
  [63997, 3901], [68900, 4715], [67058, 4370], [64835, 4774],
];
const last = data.months.length - 1;
const sum = values => values.reduce((total, value) => total + value, 0);
const change = (current, previous) => previous ? (current - previous) / previous : null;
const trend = value => value == null ? '—' : (value > 0 ? '+' : '') + percent.format(value);
const models = data.models.map(([make, model, counts]) => ({ name: make + ' ' + model, make, counts }));
const brands = data.brands.map(([name, counts]) => ({ name, counts }));
const { groups: fuelGroups, unclassified } = groupMarketFuels(data);
const ringgit = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
const modelKey = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const rank = (series, count) => series.map(entry => ({ ...entry, count: count(entry.counts) }))
  .filter(entry => entry.count > 0)
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

function RankingsTable({ entries, total, priorCount, trendLabel, priorRanks, catalogue }) {
  return <div className="market-table-wrap" tabIndex="0" aria-label="Registration rankings">
    <table className="market-table"><thead><tr>
      <th scope="col">Rank</th><th scope="col">Make or model</th><th scope="col">Registrations</th><th scope="col">Share of registrations</th>
      {priorCount && <th scope="col">{trendLabel}</th>}
      {priorRanks && <th scope="col">Rank change</th>}
      {catalogue && <th scope="col">Catalogue price</th>}
    </tr></thead><tbody>{entries.map((entry, index) => {
      const car = catalogue?.get(modelKey(entry.name));
      const prices = car?.variants.map(variant => variant.price).filter(price => price != null) ?? [];
      const previousRank = priorRanks?.get(entry.name);
      const movement = previousRank == null ? null : previousRank - index - 1;
      return <tr key={entry.name}>
        <td>{index + 1}</td><th scope="row">{car ? <a href={'/cars/?model=' + car.id}>{entry.name}</a> : entry.name}</th>
        <td>{number.format(entry.count)}</td><td>{percent.format(entry.count / total)}</td>
        {priorCount && <td>{trend(change(entry.count, priorCount(entry.counts)))}</td>}
        {priorRanks && <td>{movement == null ? '—' : movement > 0 ? '+' + movement : movement}</td>}
        {catalogue && <td>{prices.length ? 'From ' + ringgit.format(Math.min(...prices)) : '—'}</td>}
      </tr>;
    })}</tbody></table>
  </div>;
}

function VolumeChart({ series, periods, label, detailsOnly = false }) {
  const max = Math.max(1, ...series.flatMap(item => item.counts));
  const table = <div className="market-table-wrap"><table className="market-table">
        <thead><tr><th scope="col">Month</th>{series.map(item => <th scope="col" key={item.name}>{item.name}</th>)}</tr></thead>
        <tbody>{periods.map((period, index) => <tr key={period}><th scope="row">{month(period, true)}</th>
          {series.map(item => <td key={item.name}>{number.format(item.counts[index])}</td>)}</tr>)}</tbody>
      </table></div>;
  if (detailsOnly) return table;
  return <figure className="market-chart">
    <figcaption>{label}</figcaption>
    <ul className="market-legend">{series.map((item, index) => <li key={item.name}>
      <span className={'market-color market-series-' + index} />{item.name}
    </li>)}</ul>
    <div className="market-bars">{periods.map((period, index) => {
      const values = series.map(item => item.name + ': ' + number.format(item.counts[index]));
      return <div className="market-month" key={period} tabIndex={0} role="group"
        aria-label={[month(period, true), ...values].join(', ')}>
        <div className="market-columns" aria-hidden="true">{series.map((item, seriesIndex) =>
          <span key={item.name} className={'market-series-' + seriesIndex}
            style={{ height: (item.counts[index] / max * 100) + '%' }} />)}</div>
        <span aria-hidden="true">{month(period)}</span>
        <div className="market-tooltip" aria-hidden="true">
          <strong>{month(period, true)}</strong>
          {values.map(value => <span key={value}>{value}</span>)}
        </div>
      </div>;
    })}</div>
    <details className="market-chart-data"><summary>View chart data</summary>
      {table}
    </details>
  </figure>;
}

function ExportButtons({ rows, filename }) {
  const [error, setError] = useState('');
  const download = async format => {
    setError('');
    try { await exportMarketRows(rows, filename, format); }
    catch { setError('The export could not be created. Try again.'); }
  };
  return <div className="market-buttons">
    <button className="cf-button" type="button" onClick={() => download('csv')}>Export CSV</button>
    <button className="cf-button" type="button" onClick={() => download('xlsx')}>Export Excel</button>
    {error && <span role="status">{error}</span>}
  </div>;
}

const comparisonEntries = [...brands, ...models];
const popular = ['Perodua', 'Proton', 'Toyota', 'Honda', 'Perodua Bezza', 'Proton Saga', 'Perodua Axia', 'Perodua Myvi'];

function RegistrationComparison() {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState(['Perodua Bezza', 'Proton Saga']);
  const [range, setRange] = useState(12);
  const [details, setDetails] = useState(false);
  const periods = data.months.slice(-range);
  const selected = chosen.map(name => {
    const entry = comparisonEntries.find(item => item.name === name);
    return { ...entry, counts: entry.counts.slice(-range) };
  });
  const add = name => {
    setChosen(previous => previous.includes(name) || previous.length >= 3 ? previous : [...previous, name]);
    setQuery('');
  };
  const matches = query.trim()
    ? comparisonEntries.filter(entry => entry.name.toLowerCase().includes(query.trim().toLowerCase())
      && !chosen.includes(entry.name)).slice(0, 12)
    : [];
  const rows = [['Month', ...selected.map(item => item.name)],
    ...periods.map((period, index) => [period, ...selected.map(item => item.counts[index])])];
  return <section className="market-block" id="registration-comparison">
    <h2><span className="heading-accent">Compare</span> <em>registrations.</em></h2>
    <p>Compare monthly JPJ registrations for up to three makes or models.</p>
    <div className="market-controls">
      <label>Search makes or models<input type="search" value={query} onChange={event => setQuery(event.target.value)}
        disabled={chosen.length >= 3} placeholder="e.g. Proton Saga" /></label>
    </div>
    {query.trim() && <div className="market-buttons">
      {matches.length ? matches.map(({ name }) => <button key={name} type="button" className="cf-button"
        onClick={() => add(name)}>Add {name}</button>) : <p role="status">No available matches.</p>}
    </div>}
    <div className="market-buttons market-selection" aria-label="Selected makes and models">
      {chosen.map(name => <button className="cf-button" type="button" key={name} aria-label={'Remove ' + name}
        onClick={() => setChosen(chosen.filter(item => item !== name))}>{name} ×</button>)}
      {chosen.length > 0 && <button className="cf-button" type="button" onClick={() => { setChosen([]); setQuery(''); }}>Clear all</button>}
    </div>
    {chosen.length < 3 && <div className="market-buttons" aria-label="Popular comparisons">
      {popular.filter(name => !chosen.includes(name)).map(name =>
        <button className="cf-button" type="button" key={name} onClick={() => add(name)}>+ {name}</button>)}
    </div>}
    {selected.length > 0 ? <>
      <div className="market-ranking-toolbar market-selection">
        <div className="market-buttons" role="group" aria-label="Comparison range">
          {[6, 12].map(length => <button type="button" className="cf-button" key={length} aria-pressed={range === length}
            onClick={() => setRange(length)}>{length} months</button>)}
        </div>
        <div className="market-buttons" role="group" aria-label="Comparison display">
          <button type="button" className="cf-button" aria-pressed={!details} onClick={() => setDetails(false)}>Trends</button>
          <button type="button" className="cf-button" aria-pressed={details} onClick={() => setDetails(true)}>Details</button>
        </div>
      </div>
      <VolumeChart series={selected} periods={periods} label="Monthly registrations by selection" detailsOnly={details} />
      <ExportButtons rows={rows} filename={'motormate-registration-comparison-' + range + 'm'} />
    </> : <p className="cf-note">Choose a make or model to see its registration trend.</p>}
  </section>;
}

export default function MarketReport({ cars = [] }) {
  const [index, setIndex] = useState(last);
  const [ytd, setYtd] = useState(false);
  const [kind, setKind] = useState('models');
  const [showAll, setShowAll] = useState(false);
  const [fuel, setFuel] = useState('');
  const [body, setBody] = useState('');
  const [seats, setSeats] = useState('');
  const [budget, setBudget] = useState('');
  const catalogue = new Map(cars.map(car => [modelKey(car.brand + ' ' + car.name), car]));
  const period = data.months[index];
  const year = period.slice(0, 4);
  const yearStart = data.months.indexOf(year + '-01');
  const periodLabel = ytd ? 'January–' + month(period, true) : month(period, true);
  const count = values => ytd ? sum(values.slice(yearStart, index + 1)) : values[index];
  const total = count(data.totals);
  const electric = count(data.electric);
  const topModels = rank(models, count);
  const topBrands = rank(brands, count);
  const modelView = kind === 'models';
  const candidates = fuel ? [...fuelGroups[fuel][modelView ? 'models' : 'brands'].values()]
    : modelView ? models : brands;
  const eligible = modelView && (body || seats || budget) ? candidates.filter(entry => {
    const car = catalogue.get(modelKey(entry.name));
    return car && (!body || car.body === body) && car.variants.some(trim =>
      (!seats || trim.seats === Number(seats)) && (!budget || (trim.price != null && trim.price <= Number(budget))));
  }) : candidates;
  const rankings = rank(eligible, count);
  const rankingTotal = fuel ? count(fuelGroups[fuel].counts) : total;
  const priorIndex = ytd ? index - 12 : index - 1;
  const priorCount = priorIndex < 0 ? null : values => ytd
    ? sum(values.slice(yearStart - 12, priorIndex + 1)) : values[priorIndex];
  const priorRanks = priorCount ? new Map(rank(eligible, priorCount).map((entry, position) => [entry.name, position + 1])) : null;
  const rankingRows = [['Period', 'Fuel group', 'Rank', 'Make or model', 'JPJ registrations', 'Share (%)'],
    ...rankings.map((entry, position) => [periodLabel, fuelLabels[fuel] ?? 'All', position + 1, entry.name, entry.count, Number((100 * entry.count / rankingTotal).toFixed(2))])];
  const [, maaMonth, , maaYtd] = maaSales.at(-1);

  const fuelMix = Object.entries(fuelLabels).map(([key, name]) => ({ name, count: count(fuelGroups[key].counts) }));
  const unclassifiedCount = count(unclassified);
  if (unclassifiedCount) fuelMix.push({ name: 'Unclassified', count: unclassifiedCount });
  const national = sum(topBrands.filter(entry => ['Perodua', 'Proton'].includes(entry.name)).map(entry => entry.count));
  return <div className="market-report">
    <section className="cf-hero">
      <div className="hero-glow" aria-hidden="true" />
      <img className="hero-symbol" src="/assets/motormate-symbol-transparent.svg" alt="" />
      <div className="cf-hero-copy">
        <p className="hero-overline"><span className="status-dot" /> MALAYSIA AUTOMOTIVE MARKET</p>
        <h1><span>Market rankings.</span><em>Industry volume.</em></h1>
        <p>Track Malaysia’s car registrations, leading models and makes, and MAA’s reported vehicle sales.</p>
        <a className="button dark cf-hero-action" href="#registration-comparison">Compare registrations <span className="button-dot"><Arrow direction="down" /></span></a>
      </div>
    </section>
    <div className="cf-section">
      <section className="market-block" aria-labelledby="market-overview">
        <h2 id="market-overview"><span className="heading-accent">Market</span> <em>overview.</em></h2>
        <div className="market-controls market-period">
          <label>Reporting period<select value={index} onChange={event => setIndex(Number(event.target.value))}>
            {[...data.months].reverse().map((value, reverseIndex) => <option value={last - reverseIndex} key={value}>{month(value, true)}</option>)}
          </select></label>
          <div role="group" aria-label="Report view" className="market-buttons">
            <button type="button" className="cf-button" aria-pressed={!ytd} onClick={() => setYtd(false)}>Monthly</button>
            <button type="button" className="cf-button" aria-pressed={ytd} onClick={() => setYtd(true)}>Year to date</button>
          </div>
        </div>
        <div className="market-metrics" aria-live="polite">
          <div><span>JPJ car registrations</span><strong>{number.format(total)}</strong><small>{periodLabel} · {priorIndex >= 0 && year === '2026' ? trend(change(total, ytd ? priorCount(data.totals) : data.totals[index - 12])) + ' year on year' : 'JPJ published total'}</small>
            {!ytd && index > 0 && <small className="market-mom">{trend(change(total, data.totals[index - 1]))} month on month</small>}</div>
          <div><span>Leading make</span><strong>{topBrands[0].name}</strong><small>{percent.format(topBrands[0].count / total)} of registrations · {periodLabel}</small></div>
          <div><span>Top model</span><strong>{topModels[0].name}</strong><small>{number.format(topModels[0].count)} registrations · {periodLabel}</small></div>
          <div><span>Battery-electric share</span><strong>{percent.format(electric / total)}</strong><small>{number.format(electric)} registrations · {periodLabel}</small></div>
        </div>
        <div className="market-tiv">
          <div><h3>MAA Total Industry Volume</h3><p>Passenger and commercial vehicle sales reported by MAA.</p><a href={maaRelease}>September 2026 MAA release</a></div>
          <dl><div><dt>September 2026</dt><dd>{number.format(maaMonth)}</dd></div>
            <div><dt>January–September 2026</dt><dd>{number.format(maaYtd)}</dd></div></dl>
        </div>
        <details className="market-chart-data">
          <summary>View MAA sales breakdown</summary>
          <p className="cf-note">September sales were down {percent.format(1 - maaMonth / 71428)} from August 2026 (71,428 units).</p>
          <div className="market-table-wrap" tabIndex="0" aria-label="MAA sales breakdown">
            <table className="market-table"><thead><tr>
              <th scope="col">Segment</th><th scope="col">Sep 2026</th><th scope="col">Sep 2025</th><th scope="col">YoY</th>
              <th scope="col">Jan–Sep 2026</th><th scope="col">Jan–Sep 2025</th><th scope="col">YTD YoY</th>
            </tr></thead><tbody>{maaSales.map(([label, current, prior, currentYtd, priorYtd]) => <tr key={label}>
              <th scope="row">{label}</th><td>{number.format(current)}</td><td>{number.format(prior)}</td>
              <td>{trend(change(current, prior))}</td><td>{number.format(currentYtd)}</td><td>{number.format(priorYtd)}</td>
              <td>{trend(change(currentYtd, priorYtd))}</td>
            </tr>)}</tbody></table>
          </div>
        </details>
      </section>
      <section className="market-block">
        <h2><span className="heading-accent">Registration</span> <em>rankings.</em></h2>
        <div className="market-ranking-toolbar">
          <div className="market-buttons" role="group" aria-label="Ranking category">
            <button className="cf-button" type="button" aria-pressed={kind === 'models'} onClick={() => { setKind('models'); setShowAll(false); }}>Models</button>
            <button className="cf-button" type="button" aria-pressed={kind === 'brands'} onClick={() => { setKind('brands'); setShowAll(false); }}>Makes</button>
          </div>
          <ExportButtons rows={rankingRows} filename={'motormate-' + kind + '-rankings-' + period + (ytd ? '-ytd' : '')} />
        </div>
        <div className="market-controls">
          <label>Fuel type<select value={fuel} onChange={event => setFuel(event.target.value)}>
            <option value="">All fuel types</option>
            {Object.entries(fuelLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select></label>
          {modelView && <>
            <label>Body type<select value={body} onChange={event => setBody(event.target.value)}><option value="">All body types</option>
              {[...new Set(cars.map(car => car.body))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Seats<select value={seats} onChange={event => setSeats(event.target.value)}><option value="">Any seating</option>
              {[...new Set(cars.flatMap(car => car.variants.map(trim => trim.seats)).filter(Boolean))].sort((a, b) => a - b).map(value =>
                <option key={value} value={value}>{value} seats</option>)}</select></label>
            <label>Maximum catalogue price (RM)<input type="number" min="1" value={budget} onChange={event => setBudget(event.target.value)} /></label>
          </>}
        </div>
        {modelView && (body || seats || budget) && <p className="cf-note">These filters use current MotorMate catalogue specifications. Counts cover the matched model line.</p>}
        <p className="cf-note">All includes unclassified records. PHEV and EREV counts include verified model matches.</p>
        <p className="cf-note">{periodLabel} · {rankings.length} {modelView ? 'models' : 'makes'}</p>
        {rankings.length ? <RankingsTable entries={showAll ? rankings : rankings.slice(0, 20)} total={rankingTotal}
          priorCount={priorCount} priorRanks={priorRanks} trendLabel={ytd ? 'vs prior YTD' : 'vs prior month'}
          catalogue={modelView ? catalogue : null} /> : <p role="status">No registrations match these filters.</p>}
        {rankings.length > 20 && <button className="cf-button" type="button" aria-expanded={showAll}
          onClick={() => setShowAll(!showAll)}>{showAll ? 'Show top 20' : 'Show full rankings'}</button>}
      </section>
      <section className="market-block">
        <h2><span className="heading-accent">Market</span> <em>trends.</em></h2>
        <VolumeChart label="Monthly JPJ car registrations" periods={data.months.slice(12)}
          series={[{ name: '2026', counts: data.totals.slice(12) }, { name: '2025', counts: data.totals.slice(0, data.months.length - 12) }]} />
        <VolumeChart label="MAA monthly sales by segment" periods={maaMonthly.map((_, index) => data.months[12 + index])}
          series={[{ name: 'Passenger vehicles', counts: maaMonthly.map(row => row[0]) },
            { name: 'Commercial vehicles', counts: maaMonthly.map(row => row[1]) },
            { name: 'Total industry volume', counts: maaMonthly.map(sum) }]} />
        <p className="cf-note">January–August series from DOSM’s publication of MAA figures. September uses the MAA release. The published monthly figures sum to {number.format(sum(maaMonthly.map(sum)))}. MAA’s September release reports {number.format(maaYtd)} year to date. <a href={maaHistorySource}>DOSM table 2A</a></p>
        <div className="market-breakdowns">
          <div><h3>Powertrain mix</h3><p>{periodLabel}</p>
            <ul>{fuelMix.map(({ name, count: volume }) => <li key={name}><span>{name}</span>
              <strong>{number.format(volume)} · {percent.format(volume / total)}</strong></li>)}</ul>
          </div>
          <div><h3>National makes</h3><p>{periodLabel}</p>
            <ul><li><span>Perodua and Proton</span><strong>{percent.format(national / total)}</strong></li>
              <li><span>Other makes</span><strong>{percent.format((total - national) / total)}</strong></li></ul>
          </div>
        </div>
      </section>
      <section className="market-block">
        <h2><span className="heading-accent">Battery-electric</span> <em>market.</em></h2>
        <p>{number.format(electric)} registrations in {periodLabel}. JPJ groups plug-in and other hybrids in its hybrid fuel categories.</p>
        <div className="market-breakdowns">
          <div><h3>Leading electric models</h3><RankingsTable entries={rank([...fuelGroups.electric.models.values()], count).slice(0, 5)} total={electric} /></div>
          <div><h3>Leading electric makes</h3><RankingsTable entries={rank([...fuelGroups.electric.brands.values()], count).slice(0, 5)} total={electric} /></div>
        </div>
      </section>
      <section className="market-block">
        <h2><span className="heading-accent">Plug-in and</span> <em>range-extended.</em></h2>
        <p>Verified model matches · {periodLabel}</p>
        <div className="market-breakdowns">
          {['phev', 'erev'].map(key => {
            const group = fuelGroups[key];
            const volume = count(group.counts);
            return <div key={key}><h3>{fuelLabels[key]} models</h3>
              {volume > 0 ? <RankingsTable entries={rank([...group.models.values()], count).slice(0, 5)} total={volume} />
                : <p>No verified registrations for this period.</p>}
            </div>;
          })}
        </div>
      </section>
      <RegistrationComparison />
      <p className="cf-note market-sources">MotorMate aggregates the public JPJ records. Car names follow JPJ model labels. <a href={popularity}>JPJ Car Popularity dashboard</a> · <a href={transactions}>JPJ source data</a> · <a href={maaRelease}>MAA TIV release</a></p>
    </div>
  </div>;
}
