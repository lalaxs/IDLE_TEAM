import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
PROCESSOR_PATH = ROOT / "scripts/art/process_equipment_assets.py"


def load_processor():
    spec = importlib.util.spec_from_file_location(
        "process_equipment_assets", PROCESSOR_PATH
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class EquipmentAssetProcessorTests(unittest.TestCase):
    def test_loads_complete_regional_manifests(self):
        processor = load_processor()
        self.assertEqual(len(processor.load_item_ids()), 60)
        frostland = processor.load_chapter_item_ids(2)
        red_sands = processor.load_chapter_item_ids(3)
        stormsea = processor.load_chapter_item_ids(4)
        self.assertEqual(len(frostland), 12)
        self.assertEqual(len(red_sands), 12)
        self.assertEqual(len(stormsea), 12)
        self.assertIn("weapon_frost_fang_saber", frostland)
        self.assertIn("accessory_frozen_earth_horn", frostland)
        self.assertIn("weapon_dune_crescent_sickle", red_sands)
        self.assertIn("accessory_caravan_bell", red_sands)
        self.assertIn("weapon_cloudsplitter_glaive", stormsea)
        self.assertIn("accessory_skycrystal_prism", stormsea)

    def test_processes_chroma_source_into_required_transparent_outputs(self):
        processor = load_processor()
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "source.png"
            master = root / "master.png"
            runtime = root / "runtime.webp"
            preview = root / "preview.png"
            image = Image.new("RGB", (420, 360), (255, 0, 255))
            draw = ImageDraw.Draw(image)
            draw.rounded_rectangle(
                (115, 45, 305, 315),
                radius=44,
                fill=(112, 139, 112),
                outline=(58, 48, 43),
                width=18,
            )
            image.save(source)

            processor.process_equipment_source(
                source,
                master,
                runtime,
                preview,
            )

            for path, size in (
                (master, (1024, 1024)),
                (runtime, (256, 256)),
                (preview, (42, 42)),
            ):
                with Image.open(path) as result:
                    self.assertEqual(result.size, size)
                    self.assertIn("A", result.getbands())
                    alpha = result.getchannel("A")
                    self.assertEqual(alpha.getpixel((0, 0)), 0)
                    bbox = alpha.getbbox()
                    self.assertIsNotNone(bbox)
                    self.assertGreater(bbox[0], 0)
                    self.assertGreater(bbox[1], 0)
                    self.assertLess(bbox[2], result.width)
                    self.assertLess(bbox[3], result.height)


if __name__ == "__main__":
    unittest.main()
