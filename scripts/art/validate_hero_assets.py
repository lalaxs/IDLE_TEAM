import json
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "docs/art/requirements/direct-generated-hero-manifest.json"
ASSET_ROOT = ROOT / "docs/art/generated/heroes"
REVIEW_STATUS_PATH = ASSET_ROOT / "review/review-status.json"


def validate_master_image(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return ["master file is missing"]

    with Image.open(path) as image:
        if image.size != (1024, 1024):
            errors.append("master size must be 1024x1024")
        if "A" not in image.getbands():
            errors.append("image mode must include alpha")
            return errors

        alpha = image.getchannel("A")
        bbox = alpha.getbbox()
        if bbox is None:
            errors.append("subject alpha bounds must be non-empty")
            return errors

        left, top, right, bottom = bbox
        if left <= 0 or top <= 0 or right >= image.width or bottom >= image.height:
            errors.append("subject must not touch the canvas edge")

        corners = (
            alpha.getpixel((0, 0)),
            alpha.getpixel((image.width - 1, 0)),
            alpha.getpixel((0, image.height - 1)),
            alpha.getpixel((image.width - 1, image.height - 1)),
        )
        if any(corner != 0 for corner in corners):
            errors.append("all four corners must be transparent")

        subject_height_ratio = (bottom - top) / image.height
        if not 0.68 <= subject_height_ratio <= 0.84:
            errors.append("subject height must cover 68%–84% of the canvas")

    return errors


def validate_derived_image(path: Path, expected_size: tuple[int, int]) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return ["derived file is missing"]

    with Image.open(path) as image:
        if image.size != expected_size:
            errors.append(
                f"derived size must be {expected_size[0]}x{expected_size[1]}"
            )
        if "A" not in image.getbands():
            errors.append("derived image mode must include alpha")
        elif image.getchannel("A").getbbox() is None:
            errors.append("derived subject alpha bounds must be non-empty")

    return errors


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def validate_manifest(manifest: dict) -> list[str]:
    errors: list[str] = []
    heroes = manifest.get("heroes", [])
    ids = [hero.get("id") for hero in heroes]
    filenames = [hero.get("files", {}).get("master") for hero in heroes]

    if len(heroes) != 80:
        errors.append(f"manifest must contain 80 heroes, found {len(heroes)}")
    if len(set(ids)) != len(ids):
        errors.append("hero ids must be unique")
    if len(set(filenames)) != len(filenames):
        errors.append("master filenames must be unique")

    by_specialization: dict[str, set[str]] = {}
    for hero in heroes:
        by_specialization.setdefault(hero["specialization_id"], set()).add(
            hero["gender"]
        )
    if len(by_specialization) != 40:
        errors.append(
            f"manifest must contain 40 specializations, found {len(by_specialization)}"
        )
    for specialization_id, genders in by_specialization.items():
        if genders != {"m", "f"}:
            errors.append(
                f"{specialization_id} must contain m and f, found {sorted(genders)}"
            )

    human_count = sum(hero["race_id"] == "kingdom-human" for hero in heroes)
    if human_count != 54:
        errors.append(f"kingdom-human count must be 54, found {human_count}")
    if len(heroes) - human_count != 26:
        errors.append(
            f"special-race count must be 26, found {len(heroes) - human_count}"
        )
    return errors


def main() -> int:
    manifest = load_manifest()
    errors = validate_manifest(manifest)
    review_status = {}
    if REVIEW_STATUS_PATH.exists():
        review_status = json.loads(REVIEW_STATUS_PATH.read_text(encoding="utf-8"))

    counts = {
        "master": 0,
        "runtime": 0,
        "portrait": 0,
        "preview": 0,
        "approved": 0,
    }
    for hero in manifest["heroes"]:
        hero_id = hero["id"]
        file_contract = hero["files"]
        checks = (
            (
                "master",
                ASSET_ROOT / "master" / file_contract["master"],
                validate_master_image,
            ),
            (
                "runtime",
                ASSET_ROOT / "runtime" / file_contract["runtime"],
                lambda path: validate_derived_image(path, (512, 512)),
            ),
            (
                "portrait",
                ASSET_ROOT / "portraits" / file_contract["portrait"],
                lambda path: validate_derived_image(path, (256, 256)),
            ),
            (
                "preview",
                ASSET_ROOT / "previews" / file_contract["preview"],
                lambda path: validate_derived_image(path, (96, 96)),
            ),
        )
        for category, path, validator in checks:
            file_errors = validator(path)
            if file_errors:
                errors.extend(
                    f"{hero_id} {category}: {message}" for message in file_errors
                )
            else:
                counts[category] += 1

        if review_status.get(hero_id, {}).get("approved") is True:
            counts["approved"] += 1
        else:
            errors.append(f"{hero_id} review: asset is not approved")

    print(
        "Validation summary: "
        f"{counts['master']}/80 masters, "
        f"{counts['runtime']}/80 runtime, "
        f"{counts['portrait']}/80 portraits, "
        f"{counts['preview']}/80 previews, "
        f"{counts['approved']}/80 approved"
    )
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("All hero assets passed validation.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
