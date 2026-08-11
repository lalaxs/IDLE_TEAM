import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


BACKGROUND = (246, 241, 228)
CARD_BACKGROUND = (253, 250, 242)
INK = (37, 34, 29)
GRID = (206, 196, 176)
FONT_PATH = Path("/System/Library/Fonts/Hiragino Sans GB.ttc")


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT_PATH.exists():
        return ImageFont.truetype(str(FONT_PATH), size)
    return ImageFont.load_default()


def _label_from_filename(filename: str) -> str:
    stem = Path(filename).stem
    parts = stem.split("_")
    if len(parts) >= 5 and parts[0] == "bg" and parts[1] == "stage":
        return f"{int(parts[2])}-{int(parts[3])}"
    return stem


def _draw_cell(
    sheet: Image.Image,
    draw: ImageDraw.ImageDraw,
    image_path: Path,
    label: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> None:
    padding = 10
    label_height = 42
    draw.rounded_rectangle(
        (x + 4, y + 4, x + width - 4, y + height - 4),
        radius=16,
        fill=CARD_BACKGROUND,
        outline=GRID,
        width=2,
    )
    with Image.open(image_path) as source:
        fitted = ImageOps.fit(
            source.convert("RGB"),
            (width - padding * 2, height - label_height - padding * 2),
            method=Image.Resampling.LANCZOS,
        )
    sheet.paste(fitted, (x + padding, y + padding))
    draw.text(
        (x + 14, y + height - label_height + 5),
        label,
        fill=INK,
        font=_font(17),
    )


def build_region_sheet(
    master_dir: Path,
    output: Path,
    filenames: list[str],
    title: str,
) -> None:
    if len(filenames) != 4:
        raise ValueError("region contact sheet requires exactly four images")

    columns = 2
    cell_width = 560
    cell_height = 390
    title_height = 70
    sheet = Image.new(
        "RGB",
        (cell_width * columns, title_height + cell_height * 2),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 16), title, fill=INK, font=_font(28))
    for index, filename in enumerate(filenames):
        _draw_cell(
            sheet,
            draw,
            master_dir / filename,
            _label_from_filename(filename),
            (index % columns) * cell_width,
            title_height + (index // columns) * cell_height,
            cell_width,
            cell_height,
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "JPEG", quality=92)


def build_overview(
    master_dir: Path,
    output: Path,
    entries: list[dict[str, object]],
    title: str = "QINGQIU FRONTIER / 12 STAGES + CHAPTER MAP",
) -> None:
    columns = 4
    cell_width = 340
    cell_height = 250
    title_height = 70
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new(
        "RGB",
        (cell_width * columns, title_height + cell_height * rows),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(sheet)
    draw.text(
        (20, 16),
        title,
        fill=INK,
        font=_font(28),
    )
    for index, entry in enumerate(entries):
        filename = str(entry["filename"])
        stage = entry.get("stage")
        name = str(entry.get("name", ""))
        label = f"{stage or 'MAP'}  {name}".strip()
        _draw_cell(
            sheet,
            draw,
            master_dir / filename,
            label,
            (index % columns) * cell_width,
            title_height + (index // columns) * cell_height,
            cell_width,
            cell_height,
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "JPEG", quality=92)


def inspect_images(
    master_dir: Path,
    filenames: list[str],
) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for filename in filenames:
        path = master_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"missing background image: {filename}")
        with Image.open(path) as image:
            records.append(
                {
                    "filename": filename,
                    "width": image.width,
                    "height": image.height,
                    "mode": image.mode,
                }
            )
    return records


def parse_manifest(
    document: object,
) -> tuple[list[dict[str, object]], dict[str, object]]:
    if isinstance(document, list):
        return document, {
            "title": "QINGQIU FRONTIER / 12 STAGES + CHAPTER MAP",
            "regions": [
                {
                    "id": "meadow",
                    "title": "MEADOW / 1-1 — 1-4",
                    "filename": "meadow_contact_sheet_v01.jpg",
                },
                {
                    "id": "forest",
                    "title": "FOREST / 1-5 — 1-8",
                    "filename": "forest_contact_sheet_v01.jpg",
                },
                {
                    "id": "ruins",
                    "title": "RUINS / 1-9 — 1-12",
                    "filename": "ruins_contact_sheet_v01.jpg",
                },
            ],
        }
    if not isinstance(document, dict) or not isinstance(document.get("entries"), list):
        raise ValueError("manifest must be an entry list or an object with entries")
    review = document.get("review", {})
    if not isinstance(review, dict):
        raise ValueError("manifest review metadata must be an object")
    return document["entries"], review


def build_contact_sheets(
    manifest_path: Path,
    master_dir: Path,
    review_dir: Path,
) -> dict[str, object]:
    entries, review = parse_manifest(
        json.loads(manifest_path.read_text(encoding="utf-8"))
    )
    review_dir.mkdir(parents=True, exist_ok=True)

    region_outputs: list[Path] = []
    region_specs = review.get("regions", [])
    if not isinstance(region_specs, list):
        raise ValueError("manifest review regions must be a list")
    for region_spec in region_specs:
        if not isinstance(region_spec, dict):
            raise ValueError("each manifest review region must be an object")
        region = str(region_spec["id"])
        title = str(region_spec["title"])
        output_name = str(region_spec["filename"])
        filenames = [
            str(entry["filename"])
            for entry in entries
            if entry["region"] == region
        ]
        output = review_dir / output_name
        build_region_sheet(master_dir, output, filenames, title)
        region_outputs.append(output)

    overview = review_dir / "chapter_background_overview_v01.jpg"
    build_overview(
        master_dir,
        overview,
        entries,
        str(review.get("title", "BACKGROUND REVIEW")),
    )
    records = inspect_images(
        master_dir,
        [str(entry["filename"]) for entry in entries],
    )
    return {
        "region_sheets": region_outputs,
        "overview": overview,
        "records": records,
    }


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
    print(f"Built {len(outputs['region_sheets'])} region sheets.")
    print(outputs["overview"])
    print(f"Inspected {len(outputs['records'])} background masters.")


if __name__ == "__main__":
    main()
