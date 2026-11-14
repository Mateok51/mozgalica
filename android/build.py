#!/usr/bin/env python3
"""Build the original APK or its separate Cloud edition with a pinned signing key."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile
import xml.etree.ElementTree as ET

ANDROID_NS = 'http://schemas.android.com/apk/res/android'
VARIANTS = {
    'existing': ('signing-certificate.sha256', 'Trivia-Tavern-v83.apk'),
    'cloud': ('cloud-signing-certificate.sha256', 'Trivia-Tavern-Cloud-v83.apk'),
}


def run(*args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)


def prepare_manifest(root, work, variant):
    original = root / 'android/AndroidManifest.xml'
    if variant == 'existing':
        return original
    if variant != 'cloud':
        raise ValueError('Unknown APK variant')
    ET.register_namespace('android', ANDROID_NS)
    tree = ET.parse(original)
    manifest = tree.getroot()
    application = manifest.find('application')
    activity = application.find('activity')
    name = activity.get('{' + ANDROID_NS + '}name')
    if name.startswith('.'):
        activity.set('{' + ANDROID_NS + '}name', manifest.get('package') + name)
    manifest.set('package', 'hr.triviatavern.cloud')
    application.set('{' + ANDROID_NS + '}label', 'Trivia Tavern Cloud')
    result = work / 'AndroidManifest.xml'
    tree.write(result, encoding='utf-8', xml_declaration=True)
    return result


def prepare_assets(root, game):
    """Keep the WebView origin/storage, but connect bundled assets to the cloud."""
    game.mkdir(parents=True, exist_ok=True)
    files = ['cloud-transport.js', 'diagnostics.js', 'app.js', 'engine.js', 'index.html', 'styles.css', 'manifest.webmanifest',
             'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon.svg', 'og.jpg',
             'audio', 'chars', 'data', 'fonts', 'src', 'ui', 'vendor']
    for name in files:
        src, dst = root / name, game / name
        if src.is_dir():
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    shutil.copy2(root / 'android/runtime-config.js', game / 'runtime-config.js')
    index = (game / 'index.html').read_text()
    index = index.replace('<script src="vendor/peerjs.min.js"></script>', '')
    index = re.sub(r'connect-src [^;]+;',
                   "connect-src 'self' https://trivia-tavern.chaos-ballad.workers.dev wss://trivia-tavern.chaos-ballad.workers.dev;", index)
    (game / 'index.html').write_text(index)
    (game / 'sw-register.js').write_text('// Game assets are bundled in the Android application.\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--android-jar', required=True, type=Path)
    ap.add_argument('--build-tools', required=True, type=Path)
    ap.add_argument('--ecj', required=True, type=Path)
    ap.add_argument('--keystore', required=True, type=Path)
    ap.add_argument('--password-env', default='TRIVIA_SIGNING_PASSWORD')
    ap.add_argument('--variant', choices=VARIANTS, default='existing')
    ap.add_argument('--out', type=Path)
    args = ap.parse_args()
    if not os.environ.get(args.password_env):
        ap.error('Signing password must be supplied through the named environment variable')
    root = Path(__file__).resolve().parents[1]
    bt = args.build_tools.resolve()
    certificate, filename = VARIANTS[args.variant]
    args.out = (args.out or root / 'android/build' / filename).resolve()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    expected = (root / 'android' / certificate).read_text().strip()
    with tempfile.TemporaryDirectory(prefix='trivia-apk-') as tmp:
        work = Path(tmp)
        manifest = prepare_manifest(root, work, args.variant)
        for name in ['classes', 'dex', 'assets/game', 'res/drawable']:
            (work / name).mkdir(parents=True)
        prepare_assets(root, work / 'assets/game')
        shutil.copy2(root / 'icon-192.png', work / 'res/drawable/icon.png')
        sources = sorted((root / 'android/src').rglob('*.java'))
        run('java', '-jar', args.ecj.resolve(), '-8', '-proc:none', '-classpath',
            args.android_jar.resolve(), '-d', work / 'classes', *sources)
        classes = sorted((work / 'classes').rglob('*.class'))
        run(bt / 'd8', '--min-api', '26', '--lib', args.android_jar.resolve(),
            '--output', work / 'dex', *classes)
        run(bt / 'aapt', 'package', '-f', '-M', manifest, '-S', work / 'res', '-A',
            work / 'assets', '-I', args.android_jar.resolve(), '-F', work / 'unsigned.apk')
        with zipfile.ZipFile(work / 'unsigned.apk', 'a') as z:
            z.write(work / 'dex/classes.dex', 'classes.dex')
        run(bt / 'zipalign', '-f', '4', work / 'unsigned.apk', work / 'aligned.apk')
        run(bt / 'apksigner', 'sign', '--ks', args.keystore.resolve(), '--ks-pass',
            'env:' + args.password_env, '--out', work / 'signed.apk', work / 'aligned.apk')
        result = run(bt / 'apksigner', 'verify', '--verbose', '--print-certs', work / 'signed.apk',
                     capture_output=True, text=True).stdout
        digest = re.search(r'certificate SHA-256 digest: ([0-9a-f]+)', result)
        if not digest or digest[1] != expected:
            raise SystemExit('Signing certificate differs from the existing app; output was not published')
        run(bt / 'zipalign', '-c', '4', work / 'signed.apk')
        # Publish the verified APK atomically, preserving any previous artifact on failure.
        staged = args.out.with_suffix('.tmp')
        shutil.copy2(work / 'signed.apk', staged)
        staged.replace(args.out)
    print('Built and verified:', args.out)


if __name__ == '__main__':
    main()
