import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
BUILDER_PATH = ROOT / "scripts/art/build_background_contact_sheets.py"


def load_builder():
    spec = importlib.util.spec_from_file_location(
        "build_background_contact_sheets",
        BUILDER_PATH,
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BackgroundContactSheetTests(unittest.TestCase):
    def setUp(self):
        self.builder = load_builder()

    @staticmethod
    def _make_image(path: Path, color: tuple[int, int, int]) -> None:
        Image.new("RGB", (600, 400), color).save(path)

    def test_build_region_sheet_creates_readable_four_panel_jpeg(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            filenames = []
            for index, color in enumerate(
                ((120, 160, 100), (150, 110, 80), (110, 120, 130), (80, 100, 70)),
                start=1,
            ):
                filename = f"bg_stage_01_0{index}_test_v01.png"
                self._make_image(root / filename, color)
                filenames.append(filename)

            output = root / "meadow.jpg"
            self.builder.build_region_sheet(
                root,
                output,
                filenames,
                "MEADOW / 1-1 — 1-4",
            )

            self.assertTrue(output.exists())
            with Image.open(output) as result:
                self.assertEqual(result.mode, "RGB")
                self.assertGreater(result.width, 1000)
                self.assertGreater(result.height, 600)

    def test_build_overview_includes_all_thirteen_inputs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            entries = []
            for index in range(13):
                filename = f"background_{index:02d}.png"
                self._make_image(
                    root / filename,
                    ((index * 17) % 255, (index * 37) % 255, (index * 61) % 255),
                )
                entries.append(
                    {
                        "filename": filename,
                        "stage": f"1-{index + 1}" if index < 12 else None,
                        "name": f"背景 {index + 1}",
                    }
                )

            output = root / "overview.jpg"
            self.builder.build_overview(root, output, entries)

            self.assertTrue(output.exists())
            with Image.open(output) as result:
                self.assertEqual(result.mode, "RGB")
                self.assertGreater(result.width, 1000)
                self.assertGreater(result.height, 800)
                colors = result.resize((160, 120)).getcolors(maxcolors=160 * 120)
                self.assertIsNotNone(colors)
                self.assertGreaterEqual(len(colors), 13)

    def test_inspect_images_reports_dimensions_and_mode(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            filename = "background.png"
            self._make_image(root / filename, (40, 80, 120))

            records = self.builder.inspect_images(root, [filename])

            self.assertEqual(
                records,
                [
                    {
                        "filename": filename,
                        "width": 600,
                        "height": 400,
                        "mode": "RGB",
                    }
                ],
            )

    def test_inspect_images_rejects_missing_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            with self.assertRaisesRegex(FileNotFoundError, "missing.png"):
                self.builder.inspect_images(root, ["missing.png"])

    def test_review_font_renders_distinct_chinese_glyphs(self):
        font = self.builder._font(20)

        self.assertNotEqual(bytes(font.getmask("青")), bytes(font.getmask("丘")))

    def test_build_contact_sheets_uses_manifest_review_metadata(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            entries = []
            for index in range(1, 5):
                filename = f"bg_stage_02_0{index}_snowfield_v01.png"
                self._make_image(
                    root / filename,
                    (140 + index * 5, 165 + index * 4, 180 + index * 3),
                )
                entries.append(
                    {
                        "filename": filename,
                        "stage": f"2-{index}",
                        "region": "snowfield",
                        "name": f"霜原 {index}",
                    }
                )

            manifest = root / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "review": {
                            "title": "FROSTLAND / 4 STAGES",
                            "regions": [
                                {
                                    "id": "snowfield",
                                    "title": "SNOWFIELD / 2-1 — 2-4",
                                    "filename": "snowfield_contact_sheet_v01.jpg",
                                }
                            ],
                        },
                        "entries": entries,
                    }
                ),
                encoding="utf-8",
            )
            review_dir = root / "review"

            try:
                outputs = self.builder.build_contact_sheets(
                    manifest,
                    root,
                    review_dir,
                )
            except (TypeError, ValueError) as error:
                self.fail(f"metadata manifest should be supported: {error}")

            self.assertEqual(
                outputs["region_sheets"],
                [review_dir / "snowfield_contact_sheet_v01.jpg"],
            )
            self.assertEqual(len(outputs["records"]), 4)
            self.assertTrue(outputs["overview"].exists())


if __name__ == "__main__":
    unittest.main()
