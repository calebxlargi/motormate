"""Aggregate two years of published JPJ car registrations for the market report.

Usage: python3 scripts/build-market-data.py cars_2026.csv 2026-10 cars_2025.csv
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

root = Path(__file__).resolve().parent.parent
current, last_month, previous = sys.argv[1:]
year, month = map(int, last_month.split('-'))
months = [f'{year - 1}-{i:02d}' for i in range(1, 13)]
months += [f'{year}-{i:02d}' for i in range(1, month + 1)]
indexes = {period: i for i, period in enumerate(months)}
blank = lambda: [0] * len(months)
totals = blank()
fuels = defaultdict(blank)
models = defaultdict(blank)
brands = defaultdict(blank)
model_fuels = defaultdict(blank)
brand_fuels = defaultdict(blank)

for path in (previous, current):
    with open(path, encoding='utf-8-sig', newline='') as source:
        for row in csv.DictReader(source):
            index = indexes.get(row['date_reg'][:7])
            if index is None:
                continue
            maker, model, fuel = (row[key].strip() for key in ('maker', 'model', 'fuel'))
            totals[index] += 1
            fuels[fuel][index] += 1
            if maker:
                brands[maker][index] += 1
                brand_fuels[maker, fuel][index] += 1
            if maker and model:
                models[maker, model][index] += 1
                model_fuels[maker, model, fuel][index] += 1

if not all(totals):
    raise ValueError('The inputs must cover every month in the requested period.')
data = {
    'months': months, 'totals': totals, 'electric': fuels['electric'], 'fuels': dict(fuels),
    'models': [[*key, counts] for key, counts in sorted(models.items())],
    'brands': [[maker, counts] for maker, counts in sorted(brands.items())],
    'modelFuels': [[*key, counts] for key, counts in sorted(model_fuels.items())],
    'brandFuels': [[*key, counts] for key, counts in sorted(brand_fuels.items())],
}
(root / 'catalogue' / 'market-registrations.json').write_text(
    json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8',
)
