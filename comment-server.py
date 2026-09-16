#!/usr/bin/env python3
"""Локальний сервер: показує сайт + приймає коментарі у comments.md.

Запуск:  python3 comment-server.py      (порт 8000)
Сайт:    http://localhost:8000/landings/l1-upakovka-biznesu/
"""
import http.server
import json
import os
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
COMMENTS_FILE = os.path.join(ROOT, 'comments.md')


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/__comment':
            self.send_error(404)
            return
        length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(length) or b'{}')

        entry = '\n## {} · {}\n'.format(
            datetime.now().strftime('%d.%m %H:%M'),
            data.get('page', '?'))
        if data.get('section'):
            entry += '**Блок:** #{}\n'.format(data['section'])
        entry += '**Де:** «{}»\n'.format(data.get('quote', '')[:300])
        entry += '**Правка:** {}\n'.format(data.get('text', ''))

        with open(COMMENTS_FILE, 'a', encoding='utf-8') as f:
            f.write(entry)

        body = b'{"ok":true}'
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    os.chdir(ROOT)
    print('Сайт:      http://localhost:8000/landings/l1-upakovka-biznesu/')
    print('Коментарі: ' + COMMENTS_FILE)
    http.server.HTTPServer(('', 8000), Handler).serve_forever()
