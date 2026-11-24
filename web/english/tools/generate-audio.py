from pathlib import Path
import hashlib
import json
import sys
import argparse
import re

parser = argparse.ArgumentParser()
parser.add_argument('--runtime-dir', type=Path, required=True)
HERE = parser.parse_args().runtime_dir.resolve()
sys.path.insert(0, str(HERE / 'vendor'))
import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/audio'
DEST.mkdir(exist_ok=True)
ort.disable_telemetry_events()
options = ort.SessionOptions()
options.intra_op_num_threads = 4
options.inter_op_num_threads = 1
session = ort.InferenceSession(str(HERE / 'kokoro-v1.0.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
kokoro = Kokoro.from_session(session, str(HERE / 'voices-v1.0.bin'))
app = (ROOT / 'src/app.js').read_text(encoding='utf-8')
lessons = json.loads((ROOT / 'src/lessons.json').read_text(encoding='utf-8'))
phrases = [step['prompt'] for topic in lessons.values() for step in topic]
dictionary = re.search(r'const dictionary=(.*?);', app).group(1)
phrases += re.findall(r"\['([^']+)'", dictionary)
examples = re.search(r'const capabilityExamples=\[(.*?)\n  \];', app, re.S).group(1)
phrases += re.findall(r"\ben:'([^']+)'", examples)
phrases = list(dict.fromkeys(phrases))
manifest = {'voice': 'am_michael', 'language': 'en-US', 'synthetic': True, 'speed': 1.0, 'files': {}}
report = []
for index, phrase in enumerate(phrases):
    samples, rate = kokoro.create(phrase, voice='am_michael', speed=1.0, lang='en-us', continuous=True)
    assert samples.ndim == 1 and np.isfinite(samples).all()
    peak = float(np.max(np.abs(samples)))
    assert peak > 0.01
    samples = samples * (0.86 / peak)
    path = DEST / 'encoding.mp3'
    sf.write(path, samples, rate, format='MP3', subtype='MPEG_LAYER_III', compression_level=0.25)
    decoded, actual_rate = sf.read(path)
    duration = len(decoded) / actual_rate
    assert actual_rate == rate == 24000 and 0.25 < duration < 12, phrase
    assert np.isfinite(decoded).all() and np.max(np.abs(decoded)) < 0.999, phrase
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    name = 'michael-' + digest[:16] + '.mp3'
    path.replace(DEST / name)
    manifest['files'][phrase] = name
    report.append({'text': phrase, 'file': name, 'seconds': round(duration, 3),
        'bytes': (DEST / name).stat().st_size, 'sha256': digest, 'decoded': True, 'clipping': False})
    print(str(index + 1) + '/' + str(len(phrases)) + ' ' + phrase, flush=True)
(ROOT / 'src/audio.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(HERE / 'audio-checks.json').write_text(json.dumps({'voice_selected': 1, 'voice': 'am_michael', 'files': report,
    'count': len(report), 'total_bytes': sum(x['bytes'] for x in report)}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'success': True, 'count': len(report), 'bytes': sum(x['bytes'] for x in report)}))
