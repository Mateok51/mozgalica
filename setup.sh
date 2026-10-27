#!/bin/bash
# Prilagodi apsolutne putanje u skriptama na mjesto gdje je ova mapa sada.
OLD='/root/mozgalica'
NEW="$(cd "$(dirname "$0")" && pwd)"
grep -rIl --exclude-dir=.git "$OLD" . | xargs -r sed -i "s#$OLD#$NEW#g"
echo "Putanje postavljene na $NEW"
