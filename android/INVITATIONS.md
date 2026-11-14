# Incoming Android invitations

The APK registers only HTTPS links at `mateok51.github.io/mozgalica/`,
`mateok51.github.io/mozgalica/index.html`, `trivia-tavern.chaos-ballad.workers.dev/`
and `trivia-tavern.chaos-ballad.workers.dev/index.html`. The Activity validates incoming ACTION_VIEW
URLs again before loading bundled game assets. A usable incoming invitation must
contain `#ABCD-<22-character-room-secret>`; usernames, queries, encoded fragments,
nonstandard ports, other origins/paths and incomplete code-only links are rejected.
Both origins are canonicalized to the bundled game's existing GitHub home path,
whose bundled runtime config connects to the Cloudflare service. No browser is
needed to type a room code inside the APK. Links and secrets are
never added to diagnostic logs.

On a fresh Activity, a valid invitation opens the existing join screen with its
room code and relay secret. It does not auto-submit the player's name. A new
invitation delivered to an existing Activity asks before navigating away, including
when hosting a game. Cancel preserves the current page. Opening an identical full
invitation while its hash is still present does not reload the game. Leaving a room
clears that hash, so the invitation can subsequently be opened again.

## Android routing limitation

This is an unverified supported-link intent filter, not verified Android App Links.
On Android 12 and newer, HTTPS links normally open in the browser until the user
allows this app to handle the address in Android Settings. On Samsung, look under
Settings → Apps → Trivia Tavern → Set as default → Open supported links / Supported
web addresses (wording varies by OS version). Some source apps keep URLs inside
their own in-app browsers and require choosing Open in another app/browser.

There is no redirect or installation requirement for browser players: the same
invitation remains a normal HTTPS web link. Automatic verified routing would need
`https://mateok51.github.io/.well-known/assetlinks.json` served at the origin root,
with the package name and the APK's pinned signing certificate, plus autoVerify in
the manifest. Publishing a file inside `/mozgalica/` does not verify that domain.
No domain verification file is published by this change.

## Device acceptance

Install the APK as an update, enable supported links if necessary, then open a full
invitation from a second application. Check the join screen's room code, join with
a browser player, reopen the same link without resetting the game, open a different
room link and cancel/accept the confirmation. Check a cold launch and an already
running host. Invalid code-only and foreign-origin intents must not navigate the
WebView. Confirm that players without the APK still open the original web game.
Host/carrier connectivity and Android intent routing require actual-device checks;
JVM URL-policy tests and compilation cannot establish them.
