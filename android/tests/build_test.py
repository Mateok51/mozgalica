"""The Cloud edition must coexist with the original and retain its real Activity."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('apk_build', ROOT / 'android/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
NS = '{http://schemas.android.com/apk/res/android}'


class BuildVariantsTest(unittest.TestCase):
    def test_separate_cloud_install_preserves_original(self):
        original = ROOT / 'android/AndroidManifest.xml'
        before = original.read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            self.assertEqual(builder.prepare_manifest(ROOT, work, 'existing'), original)
            cloud = ET.parse(builder.prepare_manifest(ROOT, work, 'cloud')).getroot()
        self.assertEqual(original.read_bytes(), before)
        base = ET.fromstring(before)
        self.assertEqual(base.get('package'), 'hr.triviatavern.app')
        self.assertEqual(cloud.get('package'), 'hr.triviatavern.cloud')
        app = cloud.find('application')
        self.assertEqual(app.get(NS + 'label'), 'Trivia Tavern Cloud')
        self.assertEqual(app.find('activity').get(NS + 'name'), 'hr.triviatavern.app.MainActivity')
        self.assertEqual(cloud.get(NS + 'versionCode'), base.get(NS + 'versionCode'))
        self.assertEqual([p.get(NS + 'name') for p in cloud.findall('uses-permission')],
                         [p.get(NS + 'name') for p in base.findall('uses-permission')])
        self.assertEqual(app.get(NS + 'allowBackup'), 'false')

    def test_signing_identity_and_output_are_separate(self):
        self.assertEqual(builder.VARIANTS['existing'][0], 'signing-certificate.sha256')
        self.assertNotEqual(builder.VARIANTS['cloud'][0], builder.VARIANTS['existing'][0])
        self.assertNotEqual(builder.VARIANTS['cloud'][1], builder.VARIANTS['existing'][1])
        existing = (ROOT / 'android' / builder.VARIANTS['existing'][0]).read_text().strip()
        cloud = (ROOT / 'android' / builder.VARIANTS['cloud'][0]).read_text().strip()
        self.assertRegex(cloud, r'^[a-f0-9]{64}$')
        self.assertNotEqual(cloud, existing)


if __name__ == '__main__':
    unittest.main()
