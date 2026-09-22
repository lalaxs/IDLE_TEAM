import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CHAPTERS = {
    "01": {
        "version": "v02",
        "regions": {
            "meadow": ["E01", "E02", "E03", "E04", "B04"],
            "forest": ["E05", "E06", "E07", "E08", "B08"],
            "ruins": ["E09", "E10", "E11", "E12", "B12"],
        },
    },
    "02": {
        "version": "v04",
        "regions": {
            "snowfield": ["E13", "E14", "E15", "E16", "B16"],
            "pinewood": ["E17", "E18", "E19", "E20", "B20"],
            "aurora-ruins": ["E21", "E22", "E23", "E24", "B24"],
        },
    },
    "03": {
        "version": "v03",
        "regions": {
            "redsand-dunes": ["E25", "E26", "E27", "E28", "B28"],
            "wind-canyon": ["E29", "E30", "E31", "E32", "B32"],
            "sunken-city": ["E33", "E34", "E35", "E36", "B36"],
        },
    },
    "04": {
        "version": "v02",
        "regions": {
            "cloud-highlands": ["E37", "E38", "E39", "E40", "B40"],
            "storm-valley": ["E41", "E42", "E43", "E44", "B44"],
            "thunder-citadel": ["E45", "E46", "E47", "E48", "B48"],
        },
    },
    "05": {
        "version": "v01",
        "regions": {
            "blackwater-shallows": ["E49", "E50", "E51", "E52", "B52"],
            "wreck-bog": ["E53", "E54", "E55", "E56", "B56"],
            "reed-sanctum": ["E57", "E58", "E59", "E60", "B60"],
        },
    },
    "06": {
        "version": "v04",
        "regions": {
            "scorched-frontier": ["E61", "E62", "E63", "E64", "B64"],
            "ember-rift": ["E65", "E66", "E67", "E68", "B68"],
            "ash-citadel": ["E69", "E70", "E71", "E72", "B72"],
        },
    },
    "07": {
        "version": "v01",
        "regions": {
            "salt-reef": ["E73", "E74", "E75", "E76", "B76"],
            "wave-coast": ["E77", "E78", "E79", "E80", "B80"],
            "tide-ruins": ["E81", "E82", "E83", "E84", "B84"],
        },
    },
    "08": {
        "version": "v02",
        "regions": {
            "withered-hills": ["E85", "E86", "E87", "E88", "B88"],
            "old-battlefield": ["E89", "E90", "E91", "E92", "B92"],
            "barrow-grounds": ["E93", "E94", "E95", "E96", "B96"],
        },
    },
    "09": {
        "version": "v04",
        "regions": {
            "stonefang-foothills": ["E97", "E98", "E99", "E100", "B100"],
            "crystal-mine": ["E101", "E102", "E103", "E104", "B104"],
            "high-ridge": ["E105", "E106", "E107", "E108", "B108"],
        },
    },
    "10": {
        "version": "v04",
        "regions": {
            "frost-outpost": ["E109", "E110", "E111", "E112", "B112"],
            "wall-road": ["E113", "E114", "E115", "E116", "B116"],
            "northwind-citadel": ["E117", "E118", "E119", "E120", "B120"],
        },
    },
}

BACKGROUND = (236, 231, 217, 255)
CELL = (247, 244, 235, 255)
INK = (43, 42, 36, 255)
GRID = (194, 187, 168, 255)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def _character(master_dir: Path, monster_id: str, display_size: int) -> Image.Image:
    path = master_dir / f"enemy-{monster_id}.png"
    with Image.open(path) as source:
        character = source.convert("RGBA")
    if character.getchannel("A").getbbox() is None:
        raise ValueError(f"{path} has no visible pixels")
    return character.resize((display_size, display_size), Image.Resampling.LANCZOS)


def _draw_cell(
    sheet: Image.Image,
    draw: ImageDraw.ImageDraw,
    master_dir: Path,
    monster_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
    display_size: int,
) -> None:
    draw.rounded_rectangle(
        (x + 6, y + 6, x + width - 6, y + height - 6),
        radius=16,
        fill=CELL,
        outline=GRID,
        width=2,
    )
    character = _character(master_dir, monster_id, display_size)
    px = x + (width - character.width) // 2
    py = y + 4
    sheet.alpha_composite(character, (px, py))
    draw.text((x + 14, y + height - 31), monster_id, fill=INK, font=_font(16))


def build(
    master_dir: Path,
    review_dir: Path,
    chapter: str,
    region_filter: str | None = None,
) -> None:
    review_dir.mkdir(parents=True, exist_ok=True)
    config = CHAPTERS[chapter]
    all_regions = config["regions"]
    if region_filter is not None and region_filter not in all_regions:
        raise ValueError(f"unknown region for chapter {chapter}: {region_filter}")
    regions = (
        {region_filter: all_regions[region_filter]}
        if region_filter is not None
        else all_regions
    )
    version = config["version"]

    for region, monster_ids in regions.items():
        cell_width, cell_height = 240, 250
        title_height = 54
        sheet = Image.new(
            "RGBA",
            (cell_width * len(monster_ids), title_height + cell_height),
            BACKGROUND,
        )
        draw = ImageDraw.Draw(sheet)
        draw.text((18, 12), f"CHAPTER {chapter} / {region.upper()}", fill=INK, font=_font(24))
        for index, monster_id in enumerate(monster_ids):
            _draw_cell(
                sheet,
                draw,
                master_dir,
                monster_id,
                index * cell_width,
                title_height,
                cell_width,
                cell_height,
                210,
            )
        sheet.convert("RGB").save(
            review_dir / f"chapter-{chapter}-{region}-contact-sheet-{version}.png",
            "PNG",
            optimize=True,
        )

    all_ids = [monster_id for ids in regions.values() for monster_id in ids]
    columns = 5
    cell_width, cell_height = 150, 160
    title_height = 54
    rows = (len(all_ids) + columns - 1) // columns
    sheet = Image.new(
        "RGBA",
        (columns * cell_width, title_height + rows * cell_height),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(sheet)
    scope = f"{region_filter.upper()} / " if region_filter is not None else ""
    draw.text((18, 12), f"CHAPTER {chapter} / {scope}120 PX CHECK", fill=INK, font=_font(24))
    for index, monster_id in enumerate(all_ids):
        _draw_cell(
            sheet,
            draw,
            master_dir,
            monster_id,
            (index % columns) * cell_width,
            title_height + (index // columns) * cell_height,
            cell_width,
            cell_height,
            120,
        )
    check_name = (
        f"chapter-{chapter}-{region_filter}-120px-check-{version}.png"
        if region_filter is not None
        else f"chapter-{chapter}-monsters-120px-check-{version}.png"
    )
    sheet.convert("RGB").save(
        review_dir / check_name,
        "PNG",
        optimize=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master-dir", type=Path, required=True)
    parser.add_argument("--review-dir", type=Path, required=True)
    parser.add_argument("--chapter", choices=CHAPTERS, default="01")
    parser.add_argument("--region")
    args = parser.parse_args()
    build(args.master_dir, args.review_dir, args.chapter, args.region)
    print(args.review_dir)


if __name__ == "__main__":
    main()
