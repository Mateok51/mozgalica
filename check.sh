#!/bin/sh
# Brze provjere (motor, bez preglednika) s jednim retkom po testu; "./check.sh ui" dodaje kratke preglednik-testove.
cd /root/mozgalica
run() { r=$(timeout 180 node "$@" 2>&1); if echo "$r" | grep -q "✘\|NEUSPJEH\|Error"; then echo "✘ $1"; echo "$r" | grep -E "✘|Error" | head -5; else echo "✔ $1"; fi; }
( cd web/site && r=$(node --test tests/*.test.cjs 2>&1); echo "$r" | grep -q "^# fail 0" && echo "✔ main testovi (15)" || { echo "✘ main testovi"; echo "$r" | grep "^not ok" | head; } )
for t in len-test pyr-test kr-test pick-test; do run v3/$t.js; done
if [ "$1" = "ui" ]; then for t in pick-ui-test len-ui-test pyr-ui-test jerk-test who-test; do run v3/$t.js; done; fi
