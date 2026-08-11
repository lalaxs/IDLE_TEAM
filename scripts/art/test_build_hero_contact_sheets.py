import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
BUILDER_PATH = ROOT / "scripts/art/build_hero_contact_sheets.py"


def load_builder():
    spec = importlib.util.spec_from_file_location(
        "build_hero_contact_sheets", BUILDER_PATH
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ContactSheetBuilderTests(unittest.TestCase):
    def setUp(self):
        self.builder = load_builder()

    def test_builds_class_and_overview_sheets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            master_dir = root / "master"
            review_dir = root / "review"
            master_dir.mkdir()
            heroes = []
            for hero_id in ("aa-one-m", "aa-one-f", "aa-two-m", "aa-two-f"):
                filename = f"hero_{hero_id.replace('-', '_')}_master_v01.png"
                image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
                for x in range(300, 724):
                    for y in range(130, 900):
                        image.putpixel((x, y), (20, 30, 40, 255))
                image.save(master_dir / filename)
                heroes.append(
                    {
                        "id": hero_id,
                        "specialization_id": "-".join(hero_id.split("-")[:2]),
                        "class_name": "测试职业",
                        "specialization_name": "测试专精",
                        "gender": hero_id[-1],
                        "files": {"master": filename},
                    }
                )
            manifest_path = root / "manifest.json"
            manifest_path.write_text(
                json.dumps({"heroes": heroes}, ensure_ascii=False),
                encoding="utf-8",
            )

            outputs = self.builder.build_contact_sheets(
                manifest_path, master_dir, review_dir
            )

            self.assertEqual(len(outputs["class_sheets"]), 1)
            self.assertTrue(outputs["class_sheets"][0].exists())
            self.assertTrue(outputs["overview"].exists())
            with Image.open(outputs["overview"]) as overview:
                self.assertGreater(overview.width, 0)
                self.assertGreater(overview.height, 0)


if __name__ == "__main__":
    unittest.main()
