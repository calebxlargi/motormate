"""Refresh trim-level specs from BitAuto's public model comparison tables."""
import html
import json
import re
from pathlib import Path
from subprocess import CalledProcessError

from importlib.util import module_from_spec, spec_from_file_location

photo_spec = spec_from_file_location('pilot_photos', Path(__file__).with_name('import-pilot-photos.py'))
photo_import = module_from_spec(photo_spec)
photo_spec.loader.exec_module(photo_import)
CATALOGUE = photo_import.CATALOGUE

def clean(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', value)).split())

def number(value):
    if value and re.fullmatch(r'[\d,.]+', value):
        return float(value.replace(',', ''))

def specs_from_page(page):
    names = [clean(name) for name in re.findall(r'<div class="car-name">([^<]+)</div>', page)]
    records = {name: {} for name in names}
    for row in re.split(r'<div class="table-row[^"]*">', page)[1:]:
        cells = re.findall(r'<div class="table-col ([^"]+)">\s*(.*?)\s*</div>', row, re.S)
        if not cells or cells[0][0].strip() != '0':
            continue
        label = clean(cells[0][1])
        for column, cell in cells[1:]:
            match = re.match(r'c(\d+)\b', column)
            if not match:
                continue
            index = int(match[1]) - 2
            value = clean(cell).replace('<br>', ' · ').strip()
            if 0 <= index < len(names) and value not in {'', '-', '--', '—'}:
                records[names[index]][label] = 'Standard' if value == '●' else value.replace('●', '').strip()
    return records

def main():
    models = json.loads(CATALOGUE.read_text())
    for model in models:
        url = model['source'].replace('/en/cars/', '/en/') + 'config/'
        try:
            records = specs_from_page(photo_import.fetch(url).decode('utf-8'))
        except (OSError, CalledProcessError) as error:
            print(model['id'], error, flush=True)
            continue
        matches = 0
        for trim in model['variants']:
            record = records.get(str(trim['year']) + ' ' + trim['name'])
            if not record:
                continue
            trim['specSource'] = url
            trim['specs'] = record
            for field, label in [('cc', 'Displacement[cc]'), ('motorKW', 'Total Motor Power[kW]')]:
                value = number(record.get(label))
                if value:
                    trim[field] = int(value) if value.is_integer() else value
            matches += 1
        print(model['id'], matches, '/', len(model['variants']), flush=True)
    CATALOGUE.write_text(json.dumps(models, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
