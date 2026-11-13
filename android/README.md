# Trivia Tavern Android shell v81

The APK packages the shared web game and adds Android system-bar/inset handling,
platform haptic feedback, predictive/legacy Back confirmation, and an origin-targeted
WebMessagePort for pause/resume hints. The port accepts seven haptic names and two narrowly validated sharing commands.
There is no general JavaScript interface or filesystem/native method access. The APK requests Internet and the normal Android VIBRATE permission. It does not
request camera, microphone or storage access. Haptics honor Android's touch-feedback
setting and use touch-usage vibration attributes on Android 13+.

Game protocol/rules are unchanged from web v76. Browser clients have no Android
port and retain their existing behavior. QR invitations still use the existing
GitHub Pages URL. Native invitation sharing opens the Android chooser with a validated full invitation
URL. Anonymous diagnostics export opens the chooser with JSON text; there is no
automatic upload or filesystem permission. The chooser is user controlled and
opening it does not prove anything was sent. Invitation URLs include the room
secret by design; diagnostics never include invitations or room secrets.

This shell does not add a server, camera scanning, verified App Links, push notifications
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

The default output is `android/build/Trivia-Tavern-v81.apk` (ignored by Git).
Keep a secure, durable backup of the original keystore. Never commit it or its
password. A different signer cannot update an installed copy in place.

## Validation and phone checks

The Java source compiles against SDK 35. Node tests cover native adapters, anonymous diagnostic reports, input/queue limits
and game behavior. A mixed-version browser scenario using a shared v77 host
and original v76 web guest joins, starts and reconnects after host refresh with
simulated Peer transport; this is not Android/carrier-network verification. APK signing identity, version, alignment,
embedded assets and the Internet/VIBRATE permission allowlist are checked locally. JavaScript VM
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

## v79 feedback and Croatian glyph correction

Ordinary enabled buttons now produce a touch effect on actual user activation.
The generic effect waits until click handlers finish and is skipped when an
explicit confirm/impact effect already ran. Android uses bounded one-shot/waveform
vibration effects rather than relying only on a subtle platform clock tick.
Patterns do not repeat; native requests are throttled and respect the user's
system touch-feedback preference. VIBRATE is a normal permission, not a runtime
permission prompt or access to personal data. Physical strength still depends on
hardware and Samsung's system vibration settings and needs phone acceptance.

Routine feedback has been softened after phone feedback: tap is 12 ms at amplitude
85, step is 10 ms at 65, and confirm is 18 ms at 120 (Android's amplitude range is
1–255). These are requested amplitudes, not measured perceived strength; devices
without amplitude control may ignore the requested strength. Event patterns are unchanged.

Croatian display-font changes are documented with the font license. The artwork,
other glyphs and gameplay are preserved. Check “Uđi u igru” and č/ć/đ/š/ž on the
phone. If touch feedback remains absent, check Android Settings → Sounds and
vibration → System vibration, and its touch-interaction setting/intensity.

## Local vibration preference

Home → “Vibracija” (also in the phone host's lobby settings) offers “Isključeno”,
“Blago”, and “Normalno”, plus a sample touch. Fresh installations default to
“Blago”. The choice is stored locally, synchronized over the restricted native
port when it connects, and saved in Android private preferences as well. Only the
three literal `haptic-level:off`, `haptic-level:mild`, and `haptic-level:normal`
commands are accepted. “Isključeno” suppresses every haptic kind and cancels any
current native vibration. Mild mode shortens common touches and reduces requested
amplitudes for event effects; Normal restores the stronger v79 effect values.
Both modes continue to honor Android's system touch-feedback setting. Browser
fallback has the same choice with shorter pulse durations in Mild mode; actual
amplitude control is available only through Android, and some browsers do not
support vibration at all. The sample confirms that a request was sent, not that
physical vibration was measured.

## v80 invitations and durable return

Incoming full HTTPS invitations can route to the APK. On Android 12+ this needs
manual activation of supported links because the shared GitHub Pages origin does
not provide a verified domain association. See INVITATIONS.md. Browser invitations
keep their HTTPS URL. A different invitation prompts before replacing the document;
a duplicate current invitation does not reload the game.

Only after the native port connects, the game persists one recovery record in the
WebView origin's local storage (maximum 2 MiB, expiry six hours). Guest records hold
the existing player identity association, name, room and room secret; host records
include the existing replay journal and admitted-player keys. Nothing is uploaded
by recovery or included in diagnostic exports. Explicit leave and final completion
clear the record. New invitations take precedence; the exact previous guest
invitation may resume the saved guest. Browser session recovery remains unchanged.

Resume checks closed guest channels immediately. Durable host recovery restores the
last checkpoint and its logical timer state; it does not keep the host running in
the background. Android process termination or a host's lost network can still
interrupt other players until the host returns. Clearing app data removes recovery.

Validation: Node recovery/adapters, JVM invitation validation, a browser native-port
simulation that clears sessionStorage then recovers a started host from localStorage,
phone viewport checks and signed APK build. These do not replace physical Android
link routing, lifecycle and vibration acceptance.

## v81 existing illustrated character reactions

Uses the existing six painted poses per character. No image assets are replaced.
Routine submission stays neutral; correct/wrong poses start at the authoritative
reveal deadline, matching wheel sound. A stale reveal sound cannot fire after leaving
the phase. Mini-game gains, shield/power hits and the winner use existing artwork
with bounded separate aura effects. Reduced motion uses static outlines and cast
poses instead of canvas particles. Full-image breathing, squash/stretch, waddle and
pose-bounce effects were removed; positional board travel is retained.

Validation: reaction policy tests, actual Chromium delayed-reveal checks, fixed
image dimensions/transforms across poses, effect expiry/reduced-motion checks,
phone viewports and power UI tests. Real-device visual/audio acceptance is pending.
