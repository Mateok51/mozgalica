"""Refresh inline script hashes after editing index.html."""
import base64
import hashlib
import pathlib
import re
path = pathlib.Path(__file__).resolve().parents[1] / 'index.html'
text = path.read_text()
scripts = [s for s in re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', text, re.S) if s.strip()]
hashes = re.findall(r'sha256-[A-Za-z0-9+/=]+', text.split('</head>')[0])
assert len(scripts) == len(hashes)
for old, script in zip(hashes, scripts):
    text = text.replace(old, 'sha256-' + base64.b64encode(hashlib.sha256(script.encode()).digest()).decode())
path.write_text(text)
