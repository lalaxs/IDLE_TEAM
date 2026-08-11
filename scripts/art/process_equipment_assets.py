from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
ITEMS_PATH = ROOT / "src/content/items.ts"
GENERATED_ROOT = ROOT / "docs/art/generated/equipment"
CHROMA_ROOT = GENERATED_ROOT / "chroma"
MASTER_ROOT = GENERATED_ROOT / "master"
PREVIEW_ROOT = GENERATED_ROOT / "previews"
REVIEW_ROOT = GENERATED_ROOT / "review"
RUNTIME_ROOT = ROOT / "public/assets/equipment"
CHROMA_HELPER = (
    Path.home()
    / ".codex/skills/.system/imagegen/scripts/remove_chroma_key.py"
)

MASTER_SIZE = 1024
RUNTIME_SIZE = 256
PREVIEW_SIZE = 42
MAX_SUBJECT_SIZE = 820


def load_item_block() -> str:
    source = ITEMS_PATH.read_text(encoding="utf-8")
    return source.split(
        "export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [", 1
    )[1].split("] as const;", 1)[0]


def load_item_ids() -> list[str]:
    return re.findall(r'id: "([^"]+)"', load_item_block())


def load_chapter_item_ids(chapter: int) -> list[str]:
    return [
        item_id
        for item_id, item_chapter in re.findall(
            r'id: "([^"]+)".*?chapter: ([1234])',
            load_item_block(),
        )
        if int(item_chapter) == chapter
    ]


def remove_chroma(source: Path, target: Path) -> None:
    if not CHROMA_HELPER.exists():
        raise FileNotFoundError(f"chroma helper is missing: {CHROMA_HELPER}")
    subprocess.run(
        [
            sys.executable,
            str(CHROMA_HELPER),
            "--input",
            str(source),
            "--out",
            str(target),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "12",
            "--opaque-threshold",
            "220",
            "--despill",
            "--force",
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def normalize_master(keyed_source: Path, target: Path) -> None:
    with Image.open(keyed_source) as image:
        rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"subject alpha bounds are empty: {keyed_source}")
    subject = rgba.crop(bbox)
    scale = min(
        MAX_SUBJECT_SIZE / subject.width,
        MAX_SUBJECT_SIZE / subject.height,
    )
    resized = subject.resize(
        (
            max(1, round(subject.width * scale)),
            max(1, round(subject.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    master = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    master.alpha_composite(
        resized,
        (
            (MASTER_SIZE - resized.width) // 2,
            (MASTER_SIZE - resized.height) // 2,
        ),
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    master.save(target)


def export_derived(master: Path, runtime: Path, preview: Path) -> None:
    with Image.open(master) as image:
        rgba = image.convert("RGBA")
        runtime_image = rgba.resize(
            (RUNTIME_SIZE, RUNTIME_SIZE),
            Image.Resampling.LANCZOS,
        )
        preview_image = rgba.resize(
            (PREVIEW_SIZE, PREVIEW_SIZE),
            Image.Resampling.LANCZOS,
        )
    runtime.parent.mkdir(parents=True, exist_ok=True)
    preview.parent.mkdir(parents=True, exist_ok=True)
    runtime_image.save(runtime, format="WEBP", lossless=True, method=6)
    preview_image.save(preview, format="PNG")


def process_equipment_source(
    source: Path,
    master: Path,
    runtime: Path,
    preview: Path,
) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        keyed = Path(temp_dir) / "keyed.png"
        remove_chroma(source, keyed)
        normalize_master(keyed, master)
    export_derived(master, runtime, preview)


def validate_image(path: Path, expected_size: tuple[int, int]) -> list[str]:
    if not path.exists():
        return ["file is missing"]
    errors: list[str] = []
    with Image.open(path) as image:
        if image.size != expected_size:
            errors.append(
                f"size must be {expected_size[0]}x{expected_size[1]}"
            )
        if "A" not in image.getbands():
            errors.append("image must contain alpha")
            return errors
        alpha = image.getchannel("A")
        bbox = alpha.getbbox()
        if bbox is None:
            errors.append("subject alpha bounds must be non-empty")
            return errors
        if alpha.getpixel((0, 0)) != 0:
            errors.append("top-left corner must be transparent")
        if alpha.getpixel((image.width - 1, 0)) != 0:
            errors.append("top-right corner must be transparent")
        if alpha.getpixel((0, image.height - 1)) != 0:
            errors.append("bottom-left corner must be transparent")
        if alpha.getpixel((image.width - 1, image.height - 1)) != 0:
            errors.append("bottom-right corner must be transparent")
        if (
            bbox[0] <= 0
            or bbox[1] <= 0
            or bbox[2] >= image.width
            or bbox[3] >= image.height
        ):
            errors.append("subject must not touch the canvas edge")
    return errors


def build_contact_sheet(
    item_ids: list[str],
    filename: str = "equipment-contact-sheet.png",
) -> Path:
    columns = 6
    tile_size = 220
    rows = (len(item_ids) + columns - 1) // columns
    sheet = Image.new(
        "RGB",
        (columns * tile_size, rows * tile_size),
        (247, 239, 217),
    )
    draw = ImageDraw.Draw(sheet)
    for index, item_id in enumerate(item_ids):
        row, column = divmod(index, columns)
        with Image.open(RUNTIME_ROOT / f"{item_id}.webp") as image:
            art = image.convert("RGBA").resize(
                (174, 174), Image.Resampling.LANCZOS
            )
        x = column * tile_size + 23
        y = row * tile_size + 8
        sheet.paste(art, (x, y), art)
        label = item_id.replace("accessory_", "acc_")
        draw.text(
            (column * tile_size + 12, row * tile_size + 188),
            label,
            fill=(58, 48, 43),
        )
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    target = REVIEW_ROOT / filename
    sheet.save(target)
    return target


def build_small_contact_sheet(
    item_ids: list[str],
    filename: str = "equipment-small-contact-sheet.png",
) -> Path:
    columns = 6
    tile_size = 72
    rows = (len(item_ids) + columns - 1) // columns
    sheet = Image.new(
        "RGB",
        (columns * tile_size, rows * tile_size),
        (247, 239, 217),
    )
    for index, item_id in enumerate(item_ids):
        row, column = divmod(index, columns)
        with Image.open(
            PREVIEW_ROOT / f"{item_id}_preview_v01.png"
        ) as image:
            art = image.convert("RGBA")
        x = column * tile_size + (tile_size - PREVIEW_SIZE) // 2
        y = row * tile_size + (tile_size - PREVIEW_SIZE) // 2
        sheet.paste(art, (x, y), art)
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    target = REVIEW_ROOT / filename
    sheet.save(target)
    return target


def validate_all(item_ids: list[str]) -> list[str]:
    errors: list[str] = []
    if len(item_ids) != 60:
        errors.append(f"item manifest must contain 60 ids, found {len(item_ids)}")
    frostland_ids = load_chapter_item_ids(2)
    if len(frostland_ids) != 12:
        errors.append(
            f"Frostland manifest must contain 12 ids, found {len(frostland_ids)}"
        )
    red_sands_ids = load_chapter_item_ids(3)
    if len(red_sands_ids) != 12:
        errors.append(
            f"Red Sands manifest must contain 12 ids, found {len(red_sands_ids)}"
        )
    stormsea_ids = load_chapter_item_ids(4)
    if len(stormsea_ids) != 12:
        errors.append(
            f"Stormsea manifest must contain 12 ids, found {len(stormsea_ids)}"
        )
    if len(set(item_ids)) != len(item_ids):
        errors.append("item ids must be unique")
    for item_id in item_ids:
        checks = (
            (
                MASTER_ROOT / f"{item_id}_master_v01.png",
                (MASTER_SIZE, MASTER_SIZE),
                "master",
            ),
            (
                RUNTIME_ROOT / f"{item_id}.webp",
                (RUNTIME_SIZE, RUNTIME_SIZE),
                "runtime",
            ),
            (
                PREVIEW_ROOT / f"{item_id}_preview_v01.png",
                (PREVIEW_SIZE, PREVIEW_SIZE),
                "preview",
            ),
        )
        for path, size, category in checks:
            errors.extend(
                f"{item_id} {category}: {message}"
                for message in validate_image(path, size)
            )
    return errors


def process_all(item_ids: list[str]) -> None:
    for index, item_id in enumerate(item_ids, start=1):
        source = CHROMA_ROOT / f"{item_id}_source_v01.png"
        if not source.exists():
            raise FileNotFoundError(f"missing chroma source: {source}")
        process_equipment_source(
            source,
            MASTER_ROOT / f"{item_id}_master_v01.png",
            RUNTIME_ROOT / f"{item_id}.webp",
            PREVIEW_ROOT / f"{item_id}_preview_v01.png",
        )
        print(f"[{index:02d}/{len(item_ids):02d}] processed {item_id}")
    target = build_contact_sheet(item_ids)
    print(f"Wrote {target}")
    small_target = build_small_contact_sheet(item_ids)
    print(f"Wrote {small_target}")
    frostland_ids = load_chapter_item_ids(2)
    frostland_target = build_contact_sheet(
        frostland_ids,
        "frostland-equipment-contact-sheet.png",
    )
    print(f"Wrote {frostland_target}")
    frostland_small_target = build_small_contact_sheet(
        frostland_ids,
        "frostland-equipment-small-contact-sheet.png",
    )
    print(f"Wrote {frostland_small_target}")
    red_sands_ids = load_chapter_item_ids(3)
    red_sands_target = build_contact_sheet(
        red_sands_ids,
        "red-sands-equipment-contact-sheet.png",
    )
    print(f"Wrote {red_sands_target}")
    red_sands_small_target = build_small_contact_sheet(
        red_sands_ids,
        "red-sands-equipment-small-contact-sheet.png",
    )
    print(f"Wrote {red_sands_small_target}")
    stormsea_ids = load_chapter_item_ids(4)
    stormsea_target = build_contact_sheet(
        stormsea_ids,
        "stormsea-equipment-contact-sheet.png",
    )
    print(f"Wrote {stormsea_target}")
    stormsea_small_target = build_small_contact_sheet(
        stormsea_ids,
        "stormsea-equipment-small-contact-sheet.png",
    )
    print(f"Wrote {stormsea_small_target}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    item_ids = load_item_ids()
    if not args.validate:
        process_all(item_ids)
    errors = validate_all(item_ids)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(
        f"Equipment validation: {len(item_ids)}/{len(item_ids)} masters, "
        "runtime assets, and previews passed."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
