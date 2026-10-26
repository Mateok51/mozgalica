# Zvukovi

Igra trenutno koristi sintetizirane zvukove (Web Audio). Pravi zvuk dodaješ ovako:

1. Spremi datoteku kao `audio/<ime>.mp3` (npr. `audio/correct.mp3`).
2. U `index.html` upiši ime u popis `AUDIO_FILES` (npr. `const AUDIO_FILES = ['correct'];`).

Ako datoteka nedostaje ili se ne učita, igra automatski svira sintetizirani zvuk.

Imena: tap, confirm, correct, wrong, score, step, victory, tick, beep, timeup, whoosh, pop,
powerIce, powerSlime, powerBug, powerBomb, powerZap, crack, stingLeader, stingComeback, stingRival, stingDuel, stingStreak.
