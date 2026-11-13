// Motor Vehicles (Registration and Licensing) (Amendment) Rules 2025.
// The first band is up to 50 kW, followed by 10 kW bands up to 1,010 kW.
const electricRates = [
  20, 30, 40, 50, 60, 70, 80, 100, 120, 140, 160, 180,
  200, 220, 240, 260, 280, 305, 335, 365, 395, 425, 455, 485,
  515, 545, 575, 615, 665, 715, 765, 815, 865, 915, 965, 1015,
  1065, 1140, 1240, 1340, 1440, 1540, 1640, 1740, 1840, 1940, 2040, 2165,
  2315, 2465, 2615, 2765, 2915, 3065, 3215, 3365, 3515, 3690, 3890, 4090,
  4290, 4490, 4690, 4890, 5090, 5290, 5490, 5715, 5965, 6215, 6465, 6715,
  6965, 7215, 7465, 7715, 7965, 8240, 8540, 8840, 9140, 9440, 9740, 10040,
  10340, 10640, 10940, 11265, 11615, 11965, 12315, 12665, 13015, 13365, 13715, 14065,
  14415,
];

const westSaloon = {
  fixed: [20, 55, 70, 90],
  progressive: [[200, .40], [280, .50], [380, 1], [880, 2.50], [2130, 4.50]],
};
const eastSaloon = {
  fixed: [20, 44, 56, 72],
  progressive: [[160, .32], [224, .25], [274, .50], [524, 1], [1024, 1.35]],
};
const schedules = {
  west: {
    saloon: westSaloon,
    company: { fixed: [20, 110, 140, 180], progressive: [[400, .80], [560, 1], [760, 3], [2260, 7.50], [6010, 13.50]] },
    other: { fixed: [20, 85, 100, 120], progressive: [[300, .30], [360, .40], [440, .80], [840, 1.60], [1640, 1.60]] },
  },
  east: {
    saloon: eastSaloon,
    company: eastSaloon,
    other: { fixed: [20, 42.50, 50, 60], progressive: [[165, .17], [199, .22], [243, .44], [463, .88], [903, 1.20]] },
  },
};
const fixedLimits = [1000, 1200, 1400, 1600];
const progressiveLimits = [1800, 2000, 2500, 3000, Infinity];

export function roadTax({ capacity, region, category, powertrain, fuel }) {
  const amount = Number(capacity);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (powertrain === 'ev') {
    return amount > 1010 ? 20000 : electricRates[Math.max(0, Math.ceil((amount - 50) / 10))];
  }

  // The JPJ guide specifies a separate existing schedule for Sabah diesel 4WD.
  if (region === 'east' && fuel === 'Diesel' && category === 'other') return null;
  const schedule = schedules[region]?.[category];
  if (!schedule || !Number.isInteger(amount)) return null;
  if (amount <= 1600) return schedule.fixed[fixedLimits.findIndex(limit => amount <= limit)];
  const index = progressiveLimits.findIndex(limit => amount <= limit);
  const [base, increment] = schedule.progressive[index];
  const threshold = index === 0 ? 1600 : progressiveLimits[index - 1];
  return Math.round((base + increment * (amount - threshold)) * 100) / 100;
}

export function loanEstimate(price, { down, rate, years, method }) {
  if ([price, down, rate, years].some(value => value == null || value === '')) return null;
  const [amount, deposit, interestRate, term] = [price, down, rate, years].map(Number);
  if (![amount, deposit, interestRate, term].every(Number.isFinite) || amount <= 0
      || deposit < 0 || deposit > 100 || interestRate < 0 || interestRate > 100
      || !Number.isInteger(term) || term < 1 || term > 9) return null;

  const downPayment = amount * deposit / 100;
  const principal = amount - downPayment;
  const months = term * 12;
  const monthlyRate = interestRate / 1200;
  const total = method === 'reducing' && monthlyRate > 0
    ? principal * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate)) * months
    : principal * (1 + interestRate / 100 * term);
  return { downPayment, principal, interest: total - principal, total, paid: downPayment + total, monthly: total / months };
}

export function affordableCarPrice(monthlyBudget, terms) {
  const budget = Number(monthlyBudget);
  const example = loanEstimate(100000, terms);
  if (!Number.isFinite(budget) || budget <= 0 || !example || example.monthly <= 0) return null;
  const price = Math.floor(budget / example.monthly * 100000);
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

export function runningCostEstimate({ distance, consumption, rate, tax, insurance, service }) {
  if ([distance, consumption, rate, tax].some(value => value == null || value === '')) return null;
  const [km, units, price, roadTax, premium, servicing] = [distance, consumption, rate, tax, insurance, service].map(Number);
  if (![km, units, price, roadTax, premium, servicing].every(value => Number.isFinite(value) && value >= 0) || units === 0) return null;
  const energy = km / 100 * units * price;
  const annual = energy + roadTax + premium + servicing;
  if (!Number.isFinite(annual)) return null;
  return { energy, roadTax, premium, servicing, annual, monthly: annual / 12 };
}
