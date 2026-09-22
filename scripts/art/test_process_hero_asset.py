import importlib.util
import json
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

            self.processor.normalize_master(source, target, (350, 120, 1050, 1000))

            with Image.open(target) as result:
                self.assertEqual(result.size, (1024, 1024))
                self.assertEqual(result.mode, "RGBA")
                self.assertEqual(result.getpixel((0, 0))[3], 0)
                bbox = result.getchannel("A").getbbox()
                self.assertGreaterEqual(bbox[1], 100)
                self.assertLessEqual(bbox[3], 940)

    def test_normalize_master_uses_body_scale_instead_of_equipment_bounds(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "wide-source.png"
            target = Path(temp_dir) / "wide-master.png"
            image = Image.new("RGBA", (1488, 1057), (0, 0, 0, 0))
            for x in range(194, 1294):
                for y in range(390, 610):
                    image.putpixel((x, y), (20, 30, 40, 255))
            for x in range(644, 844):
                for y in range(100, 980):
                    image.putpixel((x, y), (20, 30, 40, 255))
            image.save(source)

            self.processor.normalize_master(source, target, (644, 100, 844, 980))

            with Image.open(target) as result:
                body_bbox = tuple(json.loads(result.info["hero_body_bbox"]))
                self.assertEqual(body_bbox[3] - body_bbox[1], 760)
                self.assertEqual((body_bbox[0] + body_bbox[2]) // 2, 512)
                self.assertEqual(body_bbox[3], 930)

    def test_normalize_master_ignores_nearly_transparent_background_noise(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "source.png"
            target = Path(temp_dir) / "master.png"
            image = Image.new("RGBA", (1400, 1100), (0, 0, 0, 0))
            for x in range(350, 1050):
                for y in range(120, 1000):
                    image.putpixel((x, y), (20, 30, 40, 255))
            image.putpixel((0, 0), (0, 0, 0, 1))
            image.save(source)

            self.processor.normalize_master(source, target, (350, 120, 1050, 1000))

            with Image.open(target) as result:
                self.assertEqual(result.getpixel((0, 0))[3], 0)
                self.assertEqual(result.getchannel("A").getbbox(), (210, 170, 815, 930))

    def test_normalize_master_rejects_equipment_that_only_fits_by_shrinking_body(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "oversized-equipment.png"
            target = Path(temp_dir) / "master.png"
            image = Image.new("RGBA", (1600, 1200), (20, 30, 40, 255))
            image.save(source)

            with self.assertRaisesRegex(ValueError, "regenerate or reduce the equipment"):
                self.processor.normalize_master(source, target, (650, 180, 950, 980))

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

    def test_outer_outline_expands_alpha_without_changing_canvas(self):
        image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        for x in range(20, 44):
            for y in range(20, 44):
                image.putpixel((x, y), (80, 90, 100, 255))

        result = self.processor._add_outer_outline(image, radius=4)

        self.assertEqual(result.size, image.size)
        self.assertEqual(result.getchannel("A").getbbox(), (16, 16, 48, 48))
        self.assertEqual(result.getpixel((16, 32)), (45, 36, 20, 255))
        self.assertEqual(result.getpixel((20, 20)), (80, 90, 100, 255))


if __name__ == "__main__":
    unittest.main()
