"""Download BitAuto model photos to the local catalogue preview."""
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from subprocess import CalledProcessError, check_output

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / 'catalogue' / 'malaysia-top-20.json'
PHOTO_ROOT = ROOT / 'catalogue' / 'local-photos'
PHOTO_URL = re.compile(r'https://global-img\.bitauto\.(?:my|com)/usercenter/autoalbum/[\w/.-]+\.webp')

def fetch(url):
    return check_output([
        'curl', '--fail', '--location', '--silent', '--show-error', '--max-time', '15',
        '--user-agent', 'MotorMate catalogue pilot/1.0', url,
    ])

def main():
    models = json.loads(CATALOGUE.read_text())
    for model in models:
        try:
            html = fetch(model['source']).decode('utf-8')
        except (OSError, CalledProcessError) as error:
            print(model['id'], error, flush=True)
            continue
        urls = list(dict.fromkeys(url for url in PHOTO_URL.findall(html)
                                  if '/w1200_' in url or '/w660_' in url))
        og_image = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if og_image and urlsplit(og_image[1]).hostname in {'global-img.bitauto.my', 'global-img.bitauto.com'}:
            urls.insert(0, og_image[1])
        keys = set()
        photos = []
        for url in urls:
            key = url.rsplit('/', 1)[-1].split('yichecar_')[-1]
            if key in keys:
                continue
            keys.add(key)
            path = PHOTO_ROOT / model['id'] / (str(len(photos) + 1) + '.webp')
            try:
                data = fetch(url)
                if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            except (OSError, CalledProcessError) as error:
                print(model['id'], error, flush=True)
                continue
            photos.append({'url': '/catalogue-photos/' + model['id'] + '/' + path.name, 'source': url})
            if len(photos) == 6:
                break
        model['photos'] = photos
        print(model['id'], len(photos), flush=True)
    CATALOGUE.write_text(json.dumps(models, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
