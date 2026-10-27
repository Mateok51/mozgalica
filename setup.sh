#!/bin/bash
# Prilagodi apsolutne putanje u skriptama na mjesto gdje je ova mapa sada.
OLD='/tmp/claude-0/-home-claude/d0049d8f-34eb-5d03-b489-fe414f5ca31b/scratchpad'
NEW="$(cd "$(dirname "$0")" && pwd)"
grep -rIl --exclude-dir=.git "$OLD" . | xargs -r sed -i "s#$OLD#$NEW#g"
echo "Putanje postavljene na $NEW"
