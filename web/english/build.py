#!/usr/bin/env python3
"""Build the authenticated GO English page. Python 3, no dependencies."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent

def build():
    read = lambda name: (ROOT / name).read_text(encoding='utf-8')
    document = read('src/document.html')
    values = {
        '<!--GOE_STYLES-->': '<link rel="stylesheet" href="src/standalone.css">\n  <link rel="stylesheet" href="src/styles.css">',
        '<!--GOE_MARKUP-->': read('src/markup.html'),
        '<!--GOE_LESSONS-->': json.dumps(json.loads(read('src/lessons.json')), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'),
        '<!--GOE_SCRIPTS-->': '\n  '.join('<script src="'+p+'"></script>' for p in ['assets/vendor/gsap-3.15.1.min.js', 'assets/vendor/lucide-0.468.0.min.js', 'src/app.js'])
    }
    for marker, value in values.items():
        assert document.count(marker) == 1, marker
        document = document.replace(marker, value)
    (ROOT / 'index.html').write_text(document, encoding='utf-8')

if __name__ == '__main__':
    build()
