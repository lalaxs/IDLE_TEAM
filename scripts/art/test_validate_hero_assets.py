import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "docs/art/requirements/direct-generated-hero-manifest.json"
VALIDATOR_PATH = ROOT / "scripts/art/validate_hero_assets.py"


def load_validator():
    spec = importlib.util.spec_from_file_location("validate_hero_assets", VALIDATOR_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ManifestContractTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        self.heroes = self.manifest["heroes"]

    def test_manifest_contains_80_unique_gendered_heroes(self):
        ids = [hero["id"] for hero in self.heroes]
        filenames = [hero["files"]["master"] for hero in self.heroes]

        self.assertEqual(len(ids), 80)
        self.assertEqual(len(set(ids)), 80)
        self.assertEqual(len(set(filenames)), 80)

    def test_every_specialization_has_male_and_female_entries(self):
        by_specialization = {}
        for hero in self.heroes:
            by_specialization.setdefault(hero["specialization_id"], set()).add(
                hero["gender"]
            )

        self.assertEqual(len(by_specialization), 40)
        self.assertTrue(
            all(genders == {"m", "f"} for genders in by_specialization.values())
        )

    def test_race_counts_match_confirmed_scope(self):
        kingdom_human = sum(
            hero["race_id"] == "kingdom-human" for hero in self.heroes
        )
        special_race = len(self.heroes) - kingdom_human

        self.assertEqual(kingdom_human, 54)
        self.assertEqual(special_race, 26)

    def test_every_entry_has_generation_inputs(self):
        required_text_fields = (
            "weapon",
            "silhouette",
            "palette",
            "prompt",
        )
        for hero in self.heroes:
            for field in required_text_fields:
                with self.subTest(hero=hero["id"], field=field):
                    self.assertIsInstance(hero[field], str)
                    self.assertTrue(hero[field].strip())


class AssetValidatorTests(unittest.TestCase):
    def setUp(self):
        self.validator = load_validator()

    def test_valid_master_is_accepted(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "valid.png"
            image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
            for x in range(280, 744):
                for y in range(160, 864):
                    image.putpixel((x, y), (20, 20, 20, 255))
            image.save(path)

            errors = self.validator.validate_master_image(path)

            self.assertEqual(errors, [])

    def test_master_without_alpha_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "rgb.png"
            Image.new("RGB", (1024, 1024), (255, 255, 255)).save(path)

            errors = self.validator.validate_master_image(path)

            self.assertIn("image mode must include alpha", errors)

    def test_master_touching_edge_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "edge.png"
            image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
            for x in range(0, 500):
                for y in range(100, 900):
                    image.putpixel((x, y), (20, 20, 20, 255))
            image.save(path)

            errors = self.validator.validate_master_image(path)

            self.assertIn("subject must not touch the canvas edge", errors)

    def test_wrong_size_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "small.png"
            Image.new("RGBA", (512, 512), (0, 0, 0, 0)).save(path)

            errors = self.validator.validate_master_image(path)

            self.assertIn("master size must be 1024x1024", errors)


if __name__ == "__main__":
    unittest.main()
