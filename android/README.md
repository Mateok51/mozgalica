# Trivia Tavern Android shell v78

The APK packages the shared web game and adds Android system-bar/inset handling,
platform haptic feedback, predictive/legacy Back confirmation, and an origin-targeted
WebMessagePort for pause/resume hints. The port accepts seven haptic names and two narrowly validated sharing commands.
There is no general JavaScript interface or filesystem/native method access. Only the
Internet permission is requested. Haptics honor Android's system feedback setting.

Game protocol/rules are unchanged from web v76. Browser clients have no Android
port and retain their existing behavior. QR invitations still use the existing
GitHub Pages URL. Native invitation sharing opens the Android chooser with a validated full invitation
URL. Anonymous diagnostics export opens the chooser with JSON text; there is no
automatic upload or filesystem permission. The chooser is user controlled and
opening it does not prove anything was sent. Invitation URLs include the room
secret by design; diagnostics never include invitations or room secrets.

This shell does not add a server, camera scanning, App Links, push notifications
or a background/foreground service.

## Build

Requires Python 3, Java, Android SDK platform 35, build-tools 35.0.0 and Eclipse
ECJ 3.38.0. SDK tools come from Google's official Android repository; ECJ comes
from Maven Central (`org.eclipse.jdt:ecj:3.38.0`). Keep TLS verification enabled.
The build script accepts explicit local paths and invokes tools without a shell.
Signing material stays outside the repository; do not generate a replacement key
for an existing installation. `signing-certificate.sha256` pins the existing public
certificate. The builder verifies signing/alignment before publishing its output.

Set `TRIVIA_SIGNING_PASSWORD` securely in the execution environment, then:

```sh
python3 android/build.py \
  --android-jar /path/to/android-35/android.jar \
  --build-tools /path/to/build-tools/35.0.0 \
  --ecj /path/to/ecj-3.38.0.jar \
  --keystore /private/path/trivia-test.p12
```

The default output is `android/build/Trivia-Tavern-v78.apk` (ignored by Git).
Keep a secure, durable backup of the original keystore. Never commit it or its
password. A different signer cannot update an installed copy in place.

## Validation and phone checks

The Java source compiles against SDK 35. Node tests cover native adapters, anonymous diagnostic reports, input/queue limits
and game behavior. A mixed-version browser scenario using a shared v77 host
and original v76 web guest joins, starts and reconnects after host refresh with
simulated Peer transport; this is not Android/carrier-network verification. APK signing identity, version, alignment,
embedded assets and Internet-only permission are checked locally. JavaScript VM
regressions cover browser fallback, port origin/shape checks, haptic whitelist,
closed-port fallback, pause checkpoint and resume without reload. These checks do
not run Android lifecycle dispatch, the vibrator or the actual screen compositor.

On the Galaxy S25+, install over v76/v77 without uninstalling. Verify:

- System bars hide; swiping from the edge reveals them. Camera/gesture areas and
  the keyboard do not cover inputs, answers or sound controls, in both orientations.
- Taps, correct/wrong answers and powers have feedback when system haptics are on;
  disabling Android's touch feedback is respected. No extra permission prompt.
- Back gesture/button opens a single exit confirmation; Cancel preserves the game.
- Switching apps and returning checks/reconnects the existing session without
  reloading. A host checkpoint is requested on pause as best effort.
- Join the APK host from the published v76 web game and complete a normal round
  and a mini game, including a temporary guest disconnect.

OS process death, background suspension and host-network loss remain possible.
There is no persistent background hosting guarantee. Host restoration still uses
the game's existing browser journal; the shell does not implement durable native
state migration after process death. The authoritative-server plan remains separate.

## v78 connection tools

“Podijeli pozivnicu” appears in the host's invitation panel. The browser uses
Web Share, clipboard or a selected readonly link; Android uses the system chooser.
“Pomoć s vezom” is available from Home, lobby settings and a disconnected banner.
The report is a bounded, in-memory list of event kinds, game phases and relative
times with a version/environment marker and online boolean. No names, room codes,
keys, questions, answers, URLs, device identifiers or automatic network uploads.
Java validates/reconstructs the diagnostic schema again before sharing. Native
JSON depth/size is bounded before parsing. A host-side JVM regression is provided
in `android/tests/NativePayloadsTest.java`; it uses the official `org.json:json:20240303`
JAR from Maven Central only as a test dependency. The APK uses Android's built-in JSON.

Answer receipt now distinguishes locally sent input from host confirmation.
Unconfirmed answers are retried at most twice at three-second intervals while
the same phase remains active. Existing host duplicate/stale guards apply.
The APK/web protocol and engine rules remain identical to v76.

Phone acceptance: share a QR-equivalent full invitation, cancel the chooser and
try again, join from a browser, interrupt networking briefly after an answer,
verify confirmation only after host receipt, export a report and inspect it for
privacy, then return from the chooser without losing the active party. Android
chooser/lifecycle behavior still requires actual-device testing.
