# Easier first play (local v76)

Based on main f755e7d (v75). Prepared on codex/usability-network-v76. Website deployment and Android APK delivery are separate steps.

## Decisions and wording

- Partial Sort, Link, Order and Higher/Lower work is sent during play. Timeout scores the last received draft; final confirmation locks it. Drafts cannot advance a phase. Sort/Link allow submitting an incomplete solution.
- Sort/Link explicitly explain sending and saving. Order explains automatic submission after the fourth choice. Higher/Lower explains that the first mistake ends the run and earned points remain.
- Power selection states that one power applies to the next question and shows whether a target selection follows. Bomb copy explains its touch trigger; betting copy explains that the target keeps their points. Impostor instructions depend on the player's role.
- Pyramid and Throne introductions wait for human readiness (bots are ready automatically), with the existing 180-second fallback for abandoned devices. This is not an unlimited pause.

## Timing

First occurrence means the first occurrence in the current party, not a stored per-player tutorial preference. Disconnected/rejoining players use the party's current duration.

| Phase | First occurrence | Later |
| --- | --- | --- |
| Ordinary power choice | 25 s | 18 s |
| Pyramid power choice | 18 s | 18 s |
| Sort / Link | 50 s | 40 s |
| Order | 30 s | 25 s |
| Higher/Lower | 60 s | 45 s |
| Majority | 18 s | 18 s |
| Impostor voting | 25 s | 20 s |

Ordinary and crown questions start with 20 seconds. Combined question/answer text above 24 words adds 0.5 seconds per extra word (the current 36-word maximum gets 26 seconds). Time-based scores use the actual question duration. Who/Emoji retain their authored clue timing; short pyramid statements retain the existing reading-time adjustment. Blitz stays a 30-second speed challenge.

## Verification and phone acceptance

Engine regression tests exercise drafts, undo, timeout scoring, final locks, malformed/stale input, repeated tasks, readiness and question/answer reading budgets. Browser checks exercise real controls and small-screen layout. These do not measure novice comprehension or Android WebView performance.

On phones, play with two first-time players and check: can each explain the next action before pressing Ready; do they understand self versus targeted powers; can they stop halfway through Sort/Link and still receive points; does a correct Higher/Lower prefix survive timeout; can they read longer questions while attacked; do QR guests and the host finish introductions together. Record where they hesitate, not only whether they win.

The existing v73 APK and online v75 site do not contain these source changes. An updated APK or publication is a separate delivery step. Mixed web/client versions should not be used to test the draft protocol.
