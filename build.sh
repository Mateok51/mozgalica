#!/bin/sh
# Cijela izgradnja u jednom koraku, ispisuje samo jedan redak (ili grešku).
set -e
cd /root/mozgalica
out=$( { python3 v3/kr.py && python3 v4/make.py && node v4/build-out.js && python3 web/transform.py && python3 web/assemble.py; } 2>&1 ) || { echo "$out" | tail -15; exit 1; }
left=$(ls web/site | grep -c '^_' || true)
[ "$left" = "0" ] || { echo "UPOZORENJE: testne kopije u web/site"; exit 1; }
echo "build OK ($(grep -o "^VERSION = '[^']*'" web/assemble.py | cut -d"'" -f2))"
