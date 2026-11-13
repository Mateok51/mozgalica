# Reliability and trust boundaries (local v76)

## Observed code issues and fixes

The reported incident involved five phones on separate networks: one stopped responding, followed later by the whole party. We have not reproduced that exact incident on those devices. The player count alone does not establish an overload cause.

Confirmed work amplification: each host publish called recoverable refresh, which appended a journal event even with no outstanding offers and synchronously serialized the growing journal. The periodic publish then deep-copied and stored the journal again. Inputs from multiple peers amplified this work. Empty refresh no longer grows the journal, writes are coalesced to at most once per second during ordinary play, and pagehide explicitly flushes the latest checkpoint. A process crash can lose up to the pending save interval; graceful pagehide flush is tested, not guaranteed for OS termination.

Message validation now precedes storage in host connection records and journal dispatch. Bounds cover nesting, node count, strings, array sizes, numeric validity and forbidden keys. Repeated, stale or already-finalized inputs are ignored before journal dispatch. Avatar validation preserves the legacy initial 8/9 auto-assignment sentinels, while explicit avatar changes must identify an available displayed character.

Crypto queues, MQTT pending publishes, raw packet sizes, packet count per frame and WebSocket buffered output have finite limits. Saturation closes the affected transport; it does not reset the room. Each host broker reconnects with a single timer and capped exponential backoff, canceled on room stop/generation change. Rejected relay identities cannot grow the host-key map without successful admission, and relay connections have the same bounded admission envelope as direct connections.

These are resource protections, not a proof against all denial of service. Legitimate peers on a very slow connection may need to reconnect after a limit is reached.

## Remaining architectural limits

- A host phone still owns timers, game state and publication. Its OS suspension, rendering freeze, radio loss or process death can interrupt everybody.
- Public PeerJS/TURN and MQTT brokers have no reliability commitment controlled by this project.
- The relay uses a shared room secret. It protects content against a broker/outsider without that secret, but does not isolate hostile invited participants: they can observe room-encrypted traffic and can potentially forge room messages. Private fields encrypted with the same group key are not private from a technically capable room member. The private player SK used by legacy relay packets is not a substitute for authenticated per-player server sessions.
- Review has not established arbitrary code execution or access to phone files. The current Android shell requests Internet permission, disables WebView file/content access and has no native JavaScript bridge. Browser/WebView/OS vulnerabilities and compromised distribution cannot be ruled out by application tests.

## Required target for strong player isolation

Use a dedicated authoritative server, independent of every phone and of GitHub Pages. All phones and a TV are clients. HTTPS serves the game; WSS carries commands and personalized state. No room participant supplies authoritative snapshots to another.

The server must:

1. Bind each socket to an opaque, per-room, expiring player session; never trust a player ID or role from command payloads. Owner-only start/settings rights are checked on the server. Invitation knowledge permits normal entry without adding manual host approval.
2. Keep rules, answers, scoring and deadlines on the server. Disconnecting the owner during an active round does not stop timers. A bounded grace period removes unavailable participants from readiness requirements, while a resume token restores their identity and latest accepted input.
3. Apply byte, schema, rate and queue limits before command execution; bound sockets/rooms per source and total resource use. Disconnect only the offending socket. Coalesce state for slow clients, keeping the latest state rather than every obsolete snapshot.
4. Isolate rooms in workers/processes, with memory/CPU limits and bounded mailboxes. One malformed client's commands cannot create arbitrary timers, code or outgoing destinations.
5. Send each player only their own private fields; no shared group decryption key or peer-delivered secrets. Use normal TLS verification, explicit WebSocket Origin policy, short-lived invitation/session tokens, and restrictive page CSP. Never log invitation fragments, resume tokens or plaintext private fields.
6. Persist validated snapshots/checkpoints independently of a user's browser; document restart recovery and storage retention. Monitor event-loop delay, bounded queue occupancy, rejected frames and reconnect results using pseudonymous IDs.
7. Run as an unprivileged service behind TLS, with dependency updates, process supervision, health checks and backups. Hosting account, public endpoint and the operating cost must be chosen before deployment.

This target is a design, not an implemented/deployed backend. Existing P2P fixes do not meet the stronger isolation claim by themselves.

## Verification completed locally

- Node regressions exercise 10,000 empty heartbeat refreshes without journal growth; checkpoint coalescing; pagehide flush; storage exceptions; payload/crypto/buffer bounds; broker reconnect/backoff/cancellation; draft recovery and phase transitions.
- Browser scenarios admit phone host plus five guests and TV plus six guests, reject a seventh, replace a released seat, recover after a lost first hello and rejoin after host refresh. Peer transport in these tests is simulated between isolated Chromium contexts.
- Actual carrier NAT/TURN/public MQTT behavior, Samsung background suspension, battery/thermal performance and human first-play comprehension remain device acceptance checks.

Source changes are prepared on codex/usability-network-v76. This does not deploy an authoritative server or distribute an updated APK.
