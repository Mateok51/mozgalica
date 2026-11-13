#!/usr/bin/env python3
"""Build a same-identity Android APK using official SDK tools and an external key."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile


def run(*args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--android-jar', required=True, type=Path)
    ap.add_argument('--build-tools', required=True, type=Path)
    ap.add_argument('--ecj', required=True, type=Path)
    ap.add_argument('--keystore', required=True, type=Path)
    ap.add_argument('--password-env', default='TRIVIA_SIGNING_PASSWORD')
    ap.add_argument('--out', type=Path, default=Path(__file__).parent / 'build/Trivia-Tavern-v82.apk')
    args = ap.parse_args()
    if not os.environ.get(args.password_env):
        ap.error('Signing password must be supplied through the named environment variable')
    root = Path(__file__).resolve().parents[1]
    manifest = root / 'android/AndroidManifest.xml'
    bt = args.build_tools.resolve()
    args.out = args.out.resolve()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    expected = (root / 'android/signing-certificate.sha256').read_text().strip()
    with tempfile.TemporaryDirectory(prefix='trivia-apk-') as tmp:
        work = Path(tmp)
        for name in ['classes', 'dex', 'assets/game', 'res/drawable']:
            (work / name).mkdir(parents=True)
        files = ['runtime-config.js', 'cloud-transport.js', 'diagnostics.js', 'app.js', 'engine.js', 'index.html', 'styles.css', 'manifest.webmanifest',
                 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon.svg', 'og.jpg',
                 'audio', 'chars', 'data', 'fonts', 'src', 'ui', 'vendor']
        for name in files:
            src, dst = root / name, work / 'assets/game' / name
            if src.is_dir():
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
        (work / 'assets/game/sw-register.js').write_text('// Game assets are bundled in the Android application.\n')
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
