const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('every inline script is allowed by the security policy', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(csp, 'Missing content security policy');
  const scriptPolicy = csp[1].split(';').find(part => part.trim().startsWith('script-src '));
  assert.ok(scriptPolicy, 'Missing script-src policy');
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(script => script.trim());
  assert.ok(inlineScripts.length, 'No inline scripts found');
  for (const script of inlineScripts) {
    const hash = crypto.createHash('sha256').update(script).digest('base64');
    assert.ok(scriptPolicy.includes("'sha256-" + hash + "'"), 'Script hash missing from policy; run python3 scripts/update-csp.py');
  }
});
