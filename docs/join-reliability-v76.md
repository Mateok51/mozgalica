# Six-player admission and first connection

Source changes on codex/usability-network-v76, on top of the v76 usability work. Website and APK deployment are separate steps.

The reported session had six people on phones, each on their own network. The actual phone/network failure has not been captured or reproduced. A deterministic browser transport test admits a phone host plus five guests and a TV host plus six guests. Six remains the total player limit; a playing host uses one seat, a TV host does not.

Confirmed weaknesses fixed:

- An open direct channel used to stop the relay before a roster confirmed admission. Direct transport now becomes preferred only after a host state includes the player's ID. Relay remains eligible while direct admission is pending. A silent channel is closed after 6.5 seconds and the client retries with the existing attempt/time limits.
- A full/started lobby used to send a roster without the rejected player; its screen stayed on registration. Hello now receives an explicit rejection reason. Unadmitted relay broadcasts no longer count as successful registration.
- Lobby peer snapshots used to add a replacement before removing the absent old player. At six records the replacement could fail once despite a released seat. Absent nonlocal humans are removed first in the lobby; in-progress identities are preserved.
- The timeout now suggests a QR/full invitation when the room key is missing, and does not claim the room is nonexistent solely from failed connection attempts.

Manual short-code entry has no relay key unless previously stored for that room. This security property is unchanged: QR/full invitations carry the room secret in the fragment and enable the encrypted relay path. Sharing a full invitation is recommended across separate mobile networks.

Tests use in-process PeerJS connections between isolated Chromium contexts, including a dropped first hello, six seats, released-seat replacement and an explicit seventh-player rejection. They do not exercise public signaling, TURN capacity, carrier NAT or Android radio/background behavior. A phone acceptance test with six full QR invitations across mobile networks is still required.
