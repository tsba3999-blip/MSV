"""Local English transcription. Audio and recognized text stay in memory only."""
import io
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
import av
import numpy as np
from faster_whisper import WhisperModel

MODEL = os.environ.get('MSV_SPEECH_MODEL', '/opt/msv-english-speech/model')
MAX_BYTES = 1024 * 1024
MAX_SAMPLES = 328000  # 20 seconds plus recorder padding, at 16 kHz.


def decode(data):
    if not (data.startswith((b'RIFF', b'OggS', b'\x1aE\xdf\xa3')) or data[4:8] == b'ftyp'):
        raise ValueError('Не удалось прочитать запись. Попробуйте ещё раз.')
    chunks, size = [], 0
    with av.open(io.BytesIO(data)) as container:
        if not container.streams.audio:
            raise ValueError('В записи нет звука.')
        stream = container.streams.audio[0]
        stream.thread_count = 1
        resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)
        for frame in container.decode(stream):
            for chunk in resampler.resample(frame):
                samples = chunk.to_ndarray().flatten()
                size += samples.size
                if size > MAX_SAMPLES:
                    raise ValueError('Ответ должен быть не длиннее 20 секунд.')
                chunks.append(samples)
        for chunk in resampler.resample(None):
            samples = chunk.to_ndarray().flatten()
            size += samples.size
            if size > MAX_SAMPLES:
                raise ValueError('Ответ должен быть не длиннее 20 секунд.')
            chunks.append(samples)
    if size < 6400:
        raise ValueError('Запись слишком короткая. Удерживайте GO, пока говорите.')
    audio = np.concatenate(chunks)
    if not np.isfinite(audio).all() or np.max(np.abs(audio)) < .005:
        raise ValueError('Не слышно голоса. Проверьте микрофон и попробуйте ещё раз.')
    return audio


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log recordings, recognized text, or request bodies.

    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404, {'ready': self.path == '/health'})

    def do_POST(self):
        if self.path != '/transcribe':
            return self.reply(404, {'error': 'Not found'})
        self.connection.settimeout(10)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 100 <= size <= MAX_BYTES:
                raise ValueError('Не удалось прочитать запись.')
            audio = decode(self.rfile.read(size))
            segments, _ = self.server.model.transcribe(audio, language='en', beam_size=1,
                temperature=0, condition_on_previous_text=False, vad_filter=True)
            text = ' '.join(s.text.strip() for s in segments
                if s.avg_logprob >= -1 and s.no_speech_prob < .6).strip()
            if not text or len(text) > 1000:
                raise ValueError('Не удалось расслышать. Говорите ближе к микрофону и повторите ответ.')
            self.reply(200, {'text': text})
        except ValueError as error:
            self.reply(422, {'error': str(error)})
        except Exception:
            self.reply(422, {'error': 'Не удалось обработать звук. Запишите ответ ещё раз.'})


if __name__ == '__main__':
    model = WhisperModel(MODEL, device='cpu', compute_type='int8', cpu_threads=1,
                         num_workers=1, local_files_only=True)
    server = HTTPServer(('127.0.0.1', int(os.environ.get('MSV_ENGLISH_SPEECH_PORT', '3034'))), Handler)
    server.model = model
    server.serve_forever()
