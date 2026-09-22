import argparse
from pathlib import Path

from PIL import Image


CANVAS_SIZE = (1720, 560)
BOARD_SIZE = (1720, 1000)
PROP_SIZE = (360, 240)
BOARD_BACKGROUND = (205, 201, 188, 255)


def build_review(
    sky_path: Path,
    pack_dir: Path,
    prop_paths: list[Path],
    composite_path: Path,
    board_path: Path,
) -> None:
    with Image.open(sky_path) as source:
        composite = source.convert("RGBA")
    if composite.size != CANVAS_SIZE:
        raise ValueError(f"sky must be {CANVAS_SIZE}, got {composite.size}")

    for filename in ("distant_v01.webp", "rear_v01.webp", "road_v01.webp"):
        with Image.open(pack_dir / filename) as source:
            layer = source.convert("RGBA")
        if layer.size != CANVAS_SIZE:
            raise ValueError(f"{filename} must be {CANVAS_SIZE}, got {layer.size}")
        composite.alpha_composite(layer)

    composite_path.parent.mkdir(parents=True, exist_ok=True)
    composite.save(composite_path, "PNG", optimize=True)

    board = Image.new("RGBA", BOARD_SIZE, BOARD_BACKGROUND)
    board.alpha_composite(composite, (0, 0))
    for index, prop_path in enumerate(prop_paths):
        with Image.open(prop_path) as source:
            prop = source.convert("RGBA").resize(PROP_SIZE, Image.Resampling.LANCZOS)
        board.alpha_composite(prop, (index * 430 + 35, 680))
    board.convert("RGB").save(board_path, "JPEG", quality=92)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sky", type=Path, required=True)
    parser.add_argument("--pack-dir", type=Path, required=True)
    parser.add_argument("--prop", type=Path, action="append", required=True)
    parser.add_argument("--composite", type=Path, required=True)
    parser.add_argument("--board", type=Path, required=True)
    args = parser.parse_args()
    if len(args.prop) != 4:
        parser.error("exactly four --prop values are required")
    build_review(args.sky, args.pack_dir, args.prop, args.composite, args.board)


if __name__ == "__main__":
    main()
