import argparse
import json
from collections import OrderedDict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BACKGROUND = (246, 241, 228)
INK = (27, 25, 22)
GRID = (211, 201, 180)
FONT_PATH = Path("/System/Library/Fonts/Hiragino Sans GB.ttc")


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT_PATH.exists():
        return ImageFont.truetype(str(FONT_PATH), size)
    return ImageFont.load_default()


def _fit_character(path: Path, box_size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as source:
        character = source.convert("RGBA")
    character.thumbnail(box_size, Image.Resampling.LANCZOS)
    return character


def _draw_character_cell(
    sheet: Image.Image,
    draw: ImageDraw.ImageDraw,
    image_path: Path,
    label: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> None:
    draw.rounded_rectangle(
        (x + 6, y + 6, x + width - 6, y + height - 6),
        radius=18,
        fill=(252, 249, 241),
        outline=GRID,
        width=2,
    )
    character = _fit_character(image_path, (width - 28, height - 54))
    px = x + (width - character.width) // 2
    py = y + 10 + (height - 54 - character.height) // 2
    sheet.alpha_composite(character, (px, py))
    draw.text((x + 14, y + height - 36), label, fill=INK, font=_font(16))


def build_contact_sheets(
    manifest_path: Path,
    master_dir: Path,
    review_dir: Path,
) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    review_dir.mkdir(parents=True, exist_ok=True)

    by_class: OrderedDict[str, list[dict]] = OrderedDict()
    for hero in manifest["heroes"]:
        class_code = hero["specialization_id"].split("-")[0]
        by_class.setdefault(class_code, []).append(hero)

    class_outputs: list[Path] = []
    cell_width = 360
    cell_height = 360
    title_height = 64
    for class_code, heroes in by_class.items():
        specializations: OrderedDict[str, list[dict]] = OrderedDict()
        for hero in heroes:
            specializations.setdefault(hero["specialization_id"], []).append(hero)
        rows = len(specializations)
        sheet = Image.new(
            "RGBA",
            (cell_width * 2, title_height + cell_height * rows),
            BACKGROUND + (255,),
        )
        draw = ImageDraw.Draw(sheet)
        class_name = heroes[0]["class_name"]
        draw.text(
            (20, 16),
            f"{class_name} / {class_code.upper()}",
            fill=INK,
            font=_font(28),
        )
        for row, pair in enumerate(specializations.values()):
            pair = sorted(pair, key=lambda hero: 0 if hero["gender"] == "m" else 1)
            for column, hero in enumerate(pair):
                _draw_character_cell(
                    sheet,
                    draw,
                    master_dir / hero["files"]["master"],
                    f"{hero['specialization_name']} / {hero['gender'].upper()} / {hero['id']}",
                    column * cell_width,
                    title_height + row * cell_height,
                    cell_width,
                    cell_height,
                )
        output_path = review_dir / f"class-{class_code}-contact-sheet.png"
        sheet.convert("RGB").save(output_path, "PNG", optimize=True)
        class_outputs.append(output_path)

    columns = 10
    overview_cell_width = 150
    overview_cell_height = 160
    overview_title_height = 56
    rows = (len(manifest["heroes"]) + columns - 1) // columns
    overview = Image.new(
        "RGBA",
        (
            columns * overview_cell_width,
            overview_title_height + rows * overview_cell_height,
        ),
        BACKGROUND + (255,),
    )
    overview_draw = ImageDraw.Draw(overview)
    overview_draw.text(
        (18, 12),
        "80 HEROES / 40 SPECIALIZATIONS / M + F",
        fill=INK,
        font=_font(26),
    )
    for index, hero in enumerate(manifest["heroes"]):
        x = (index % columns) * overview_cell_width
        y = overview_title_height + (index // columns) * overview_cell_height
        _draw_character_cell(
            overview,
            overview_draw,
            master_dir / hero["files"]["master"],
            hero["id"],
            x,
            y,
            overview_cell_width,
            overview_cell_height,
        )
    overview_path = review_dir / "all-heroes-contact-sheet.png"
    overview.convert("RGB").save(overview_path, "PNG", optimize=True)

    return {"class_sheets": class_outputs, "overview": overview_path}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--master-dir", type=Path, required=True)
    parser.add_argument("--review-dir", type=Path, required=True)
    args = parser.parse_args()
    outputs = build_contact_sheets(
        args.manifest,
        args.master_dir,
        args.review_dir,
    )
    print(f"Built {len(outputs['class_sheets'])} class sheets.")
    print(outputs["overview"])


if __name__ == "__main__":
    main()
