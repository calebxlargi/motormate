export const buyingTimeCodes = [
  'within2Weeks', 'within1Month', 'within2Months', 'within3Months',
  'within4Months', 'within5Months', 'within6Months',
];

const nearTerm = ['immediately', ...buyingTimeCodes.slice(0, 4)];
const answer = value => value?.toLowerCase() ?? '';

export function malaysianMobile(input) {
  const digits = input.replace(/[\s()-]/g, '');
  const local = digits.replace(/^\+?60/, '0');
  if (!/^01(?:1\d{8}|[02-9]\d{7})$/.test(local)) return '';
  return '+60' + local.slice(1);
}

export function malaysiaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function vehicle(values, prefix) {
  const brand = values[prefix + 'Brand'];
  const model = values[prefix + 'Model'];
  return {
    brand: brand === 'Other brand' ? values[prefix + 'OtherBrand']?.trim() : brand,
    model: model === 'Other model' || brand === 'Other brand'
      ? values[prefix + 'OtherModel']?.trim()
      : model,
  };
}

export function leadScore({ identified, budget, verified, buyingTime, finance, insurance, tradeCar, scheduled }) {
  if (scheduled) return 100;
  if (tradeCar) return 80;
  if (finance === 'yes' && insurance === 'yes') return 60;
  if (nearTerm.includes(buyingTime)) return 40;
  if (verified) return 25;
  return identified && budget ? 20 : 0;
}

export function previewLeadRows(values, verifiedAt, submittedAt = new Date(), phone = malaysianMobile(values.phone)) {
  const { brand = '', model = '' } = vehicle(values, 'buy');
  const identified = Boolean(brand && model && brand !== 'Help me choose' && model !== 'Help me choose');
  const trade = answer(values.trade);
  const tradeVehicle = trade === 'yes' ? vehicle(values, 'trade') : {};
  const tradeCar = tradeVehicle.brand && tradeVehicle.model ? [tradeVehicle.brand, tradeVehicle.model].join(' / ') : '';
  const finance = answer(values.loan);
  const insurance = answer(values.insuranceQuote);
  const testDrive = answer(values.testDrive);
  const buyingTime = values.timingChoice === 'slider' ? buyingTimeCodes[Number(values.timeline)] : values.timingChoice;
  const budget = values.noLimit ? '' : Number(values.budget);
  const variant = identified ? values.variant?.trim() || '' : '';
  const score = leadScore({ identified, budget, verified: Boolean(verifiedAt), buyingTime, finance, insurance, tradeCar });

  return {
    Sheet1: {
      No: 1,
      name: values.name.trim(),
      mobile: phone,
      brand,
      model,
      variant,
      city: values.city.trim(),
      created: malaysiaDate(submittedAt),
      lead_score: score,
      communication_preference: values.contact === 'WhatsApp' ? 'whatsapp' : 'call',
      buying_time: buyingTime,
      ' finance': finance,
      insurance,
      trade_in: trade,
      trade_in_car: tradeCar,
      test_drive: testDrive,
      test_drive_date: testDrive === 'yes' ? values.testDate || '' : '',
      extra_features: values.notes?.trim() || '',
    },
    'Lead Details': {
      No: 1,
      state: values.state,
      brand,
      model,
      variant,
      vehicle_condition: values.condition || '',
      body_type: values.body || '',
      seats: values.seats || '',
      powertrain: values.fuel || '',
      intended_use: values.use || '',
      budget_rm: budget,
      budget_no_upper_limit: values.noLimit ? 'yes' : 'no',
      loan_duration: finance === 'yes' ? values.loanDuration : '',
      current_car_insurance: answer(values.currentInsurance),
      ncd: values.currentInsurance === 'Yes' ? values.ncd || '' : '',
      trade_in_make: tradeVehicle.brand || '',
      trade_in_model: tradeVehicle.model || '',
      trade_in_year: trade === 'yes' ? values.tradeYear || '' : '',
      trade_in_mileage_km: trade === 'yes' ? values.mileage || '' : '',
      trade_in_outstanding_loan: trade === 'yes' ? answer(values.outstanding) : '',
      test_drive_status: testDrive === 'yes' ? 'requested' : '',
      otp_verified_at: verifiedAt ? verifiedAt.toISOString() : '',
    },
  };
}
