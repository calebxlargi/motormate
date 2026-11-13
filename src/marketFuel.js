export const fuelLabels = {
  combustion: 'Petrol, Diesel & Hybrid',
  electric: 'Electric',
  phev: 'PHEV',
  erev: 'EREV',
};

const conventional = new Set(['petrol', 'diesel', 'greendiesel', 'petrol_ng']);

// Model-level matches apply only to the specified JPJ fuel code.
const modelGroups = [
  // Toyota Malaysia price list and Honda Malaysia e:HEV model lineup.
  ['Toyota', 'Corolla Cross', 'hybrid_petrol', 'combustion'],
  ['Toyota', 'Yaris Cross', 'hybrid_petrol', 'combustion'],
  ['Toyota', 'Vios', 'hybrid_petrol', 'combustion'],
  ['Toyota', 'Camry', 'hybrid_petrol', 'combustion'],
  ['Toyota', 'Harrier', 'hybrid_petrol', 'combustion'],
  ['Toyota', 'Innova Zenix', 'hybrid_petrol', 'combustion'],
  ['Toyota', 'Vellfire', 'hybrid_petrol', 'combustion'],
  ['Honda', 'City', 'hybrid_petrol', 'combustion'],
  ['Honda', 'City Hatchback', 'hybrid_petrol', 'combustion'],
  ['Honda', 'Civic', 'hybrid_petrol', 'combustion'],
  ['Honda', 'CR-V', 'hybrid_petrol', 'combustion'],
  ['Honda', 'HR-V', 'hybrid_petrol', 'combustion'],
  // Nissan Malaysia e-POWER, GWM Malaysia HEV lineup and Chery Malaysia.
  ['Nissan', 'Kicks', 'hybrid_petrol', 'combustion'],
  ['Nissan', 'Serena', 'hybrid_petrol', 'combustion'],
  ['Great Wall', 'Haval H6', 'hybrid_petrol', 'combustion'],
  ['Great Wall', 'Tank 300', 'hybrid_petrol', 'combustion'],
  ['Great Wall', 'Tank 500', 'hybrid_petrol', 'combustion'],
  ['Chery', 'Tiggo Cross', 'hybrid_petrol', 'combustion'],
  // Proton, Jetour and Chery Malaysia plug-in product releases.
  ['Proton', 'e.MAS 7', 'hybrid_petrol', 'phev'],
  ['Jetour', 'T2', 'hybrid_petrol', 'phev'],
  ['Chery', 'Tiggo 7', 'hybrid_petrol', 'phev'],
  ['Chery', 'Tiggo 8', 'hybrid_petrol', 'phev'],
  // ROX Motor identifies the Adamas as a range-extended EV.
  ['ROX', 'Adamas', 'other', 'erev'],
];
const verified = new Map(modelGroups.map(([make, model, fuel, group]) => [[make, model, fuel].join('|').toLowerCase(), group]));

export function groupMarketFuels(data) {
  const groups = Object.fromEntries(Object.keys(fuelLabels).map(key => [key, {
    counts: data.months.map(() => 0), models: new Map(), brands: new Map(),
  }]));
  for (const [make, model, fuel, counts] of data.modelFuels) {
    const key = conventional.has(fuel) ? 'combustion'
      : fuel === 'electric' ? 'electric' : verified.get([make, model, fuel].join('|').toLowerCase());
    const group = groups[key];
    if (!group) continue;
    const name = make + ' ' + model;
    if (!group.models.has(name)) group.models.set(name, { name, counts: data.months.map(() => 0) });
    if (!group.brands.has(make)) group.brands.set(make, { name: make, counts: data.months.map(() => 0) });
    counts.forEach((count, index) => {
      group.counts[index] += count;
      group.models.get(name).counts[index] += count;
      group.brands.get(make).counts[index] += count;
    });
  }
  const unclassified = data.totals.map((total, index) =>
    total - Object.values(groups).reduce((sum, group) => sum + group.counts[index], 0));
  return { groups, unclassified };
}
