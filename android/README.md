# Trivia Tavern Android shell v77

The APK packages the shared web game and adds Android system-bar/inset handling,
platform haptic feedback, predictive/legacy Back confirmation, and an origin-targeted
WebMessagePort for pause/resume hints. The port accepts only seven haptic names;
there is no JavaScript interface or filesystem/native method access. Only the
Internet permission is requested. Haptics honor Android's system feedback setting.

Game protocol/rules are unchanged from web v76. Browser clients have no Android
port and retain their existing behavior. QR invitations still use the existing
GitHub Pages URL. This shell does not add a server, camera scanning, App Links,
push notifications or a background/foreground service.

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

The default output is `android/build/Trivia-Tavern-v77.apk` (ignored by Git).
Keep a secure, durable backup of the original keystore. Never commit it or its
password. A different signer cannot update an installed copy in place.

## Validation and phone checks

The Java source compiles against SDK 35. All 113 Node tests pass, including eight
native-adapter checks. A mixed-version browser scenario using a shared v77 host
and original v76 web guest joins, starts and reconnects after host refresh with
simulated Peer transport; this is not Android/carrier-network verification. APK signing identity, version, alignment,
embedded assets and Internet-only permission are checked locally. JavaScript VM
regressions cover browser fallback, port origin/shape checks, haptic whitelist,
closed-port fallback, pause checkpoint and resume without reload. These checks do
not run Android lifecycle dispatch, the vibrator or the actual screen compositor.

On the Galaxy S25+, install over v76 without uninstalling. Verify:

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
