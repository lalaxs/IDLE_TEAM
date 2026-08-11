import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PROCESSOR_PATH = ROOT / "scripts/art/process_hero_asset.py"


def load_processor():
    spec = importlib.util.spec_from_file_location("process_hero_asset", PROCESSOR_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class HeroAssetProcessorTests(unittest.TestCase):
    def setUp(self):
        self.processor = load_processor()

    def test_normalize_master_creates_1024_square_with_alpha_padding(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "source.png"
            target = Path(temp_dir) / "master.png"
            image = Image.new("RGBA", (1400, 1100), (0, 0, 0, 0))
            for x in range(350, 1050):
                for y in range(120, 1000):
                    image.putpixel((x, y), (20, 30, 40, 255))
            image.save(source)

            self.processor.normalize_master(source, target)

            with Image.open(target) as result:
                self.assertEqual(result.size, (1024, 1024))
                self.assertEqual(result.mode, "RGBA")
                self.assertEqual(result.getpixel((0, 0))[3], 0)
                bbox = result.getchannel("A").getbbox()
                self.assertGreaterEqual(bbox[1], 100)
                self.assertLessEqual(bbox[3], 940)

    def test_normalize_master_keeps_wide_subject_at_least_68_percent_tall(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "wide-source.png"
            target = Path(temp_dir) / "wide-master.png"
            image = Image.new("RGBA", (1488, 1057), (0, 0, 0, 0))
            for x in range(171, 1239):
                for y in range(91, 906):
                    image.putpixel((x, y), (20, 30, 40, 255))
            image.save(source)

            self.processor.normalize_master(source, target)

            with Image.open(target) as result:
                bbox = result.getchannel("A").getbbox()
                subject_height_ratio = (bbox[3] - bbox[1]) / result.height
                self.assertGreaterEqual(subject_height_ratio, 0.68)
                self.assertGreater(bbox[0], 0)
                self.assertLess(bbox[2], result.width)

    def test_export_derived_assets_uses_required_sizes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            master = Path(temp_dir) / "master.png"
            runtime = Path(temp_dir) / "runtime.webp"
            portrait = Path(temp_dir) / "portrait.webp"
            preview = Path(temp_dir) / "preview.png"
            image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
            for x in range(250, 775):
                for y in range(120, 900):
                    image.putpixel((x, y), (20, 30, 40, 255))
            image.save(master)

            self.processor.export_derived_assets(
                master, runtime, portrait, preview
            )

            with Image.open(runtime) as result:
                self.assertEqual(result.size, (512, 512))
                self.assertIn("A", result.getbands())
            with Image.open(portrait) as result:
                self.assertEqual(result.size, (256, 256))
                self.assertIn("A", result.getbands())
            with Image.open(preview) as result:
                self.assertEqual(result.size, (96, 96))
                self.assertIn("A", result.getbands())


if __name__ == "__main__":
    unittest.main()
