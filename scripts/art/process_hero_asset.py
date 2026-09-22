import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter
from PIL.PngImagePlugin import PngInfo


MASTER_SIZE = 1024
MASTER_BODY_HEIGHT = 760
MASTER_BODY_CENTER_X = 512
MASTER_BASELINE_Y = 930
MASTER_SAFE_MARGIN = 32
VISIBLE_ALPHA_THRESHOLD = 1
RUNTIME_OUTLINE_RADIUS = 12
RUNTIME_OUTLINE_COLOR = (45, 36, 20)


def _alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    rgba = image.convert("RGBA")
    visible_alpha = rgba.getchannel("A").point(
        lambda value: 255 if value > VISIBLE_ALPHA_THRESHOLD else 0
    )
    bbox = visible_alpha.getbbox()
    if bbox is None:
        raise ValueError("source image contains no visible alpha subject")
    return bbox


def _validate_body_bbox(
    body_bbox: tuple[int, int, int, int],
    image_size: tuple[int, int],
) -> None:
    left, top, right, bottom = body_bbox
    width, height = image_size
    if not (0 <= left < right <= width and 0 <= top < bottom <= height):
        raise ValueError("body bbox must be a non-empty rectangle inside the source image")


def normalize_master(
    source_path: Path,
    target_path: Path,
    body_bbox: tuple[int, int, int, int],
) -> None:
    with Image.open(source_path) as source:
        rgba = source.convert("RGBA")
        _validate_body_bbox(body_bbox, rgba.size)
        bbox = _alpha_bbox(rgba)
        subject = rgba.crop(bbox)

    body_left, body_top, body_right, body_bottom = body_bbox
    subject_left, subject_top, _, _ = bbox
    body_in_subject = (
        body_left - subject_left,
        body_top - subject_top,
        body_right - subject_left,
        body_bottom - subject_top,
    )
    scale = MASTER_BODY_HEIGHT / (body_bottom - body_top)
    resized_size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(resized_size, Image.Resampling.LANCZOS)

    scaled_body = tuple(round(value * scale) for value in body_in_subject)
    scaled_body_left, scaled_body_top, scaled_body_right, scaled_body_bottom = scaled_body
    x = MASTER_BODY_CENTER_X - (scaled_body_left + scaled_body_right) // 2
    y = MASTER_BASELINE_Y - scaled_body_bottom
    if (
        x < MASTER_SAFE_MARGIN
        or y < MASTER_SAFE_MARGIN
        or x + subject.width > MASTER_SIZE - MASTER_SAFE_MARGIN
        or y + subject.height > MASTER_SIZE - MASTER_SAFE_MARGIN
    ):
        raise ValueError(
            "equipment exceeds the master safety area at the shared body scale; "
            "regenerate or reduce the equipment instead of shrinking the hero"
        )

    canvas = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(subject, (x, y))

    normalized_body_bbox = (
        x + scaled_body_left,
        y + scaled_body_top,
        x + scaled_body_right,
        y + scaled_body_bottom,
    )
    metadata = PngInfo()
    metadata.add_text("hero_body_bbox", json.dumps(normalized_body_bbox))
    target_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target_path, "PNG", optimize=True, pnginfo=metadata)


def _portrait_crop(master: Image.Image) -> Image.Image:
    bbox = _alpha_bbox(master)
    left, top, right, bottom = bbox
    subject_width = right - left
    subject_height = bottom - top
    side = min(
        MASTER_SIZE,
        round(max(subject_width * 1.12, subject_height * 0.64)),
    )
    center_x = (left + right) // 2
    crop_left = center_x - side // 2
    crop_top = max(0, top - round(side * 0.06))
    crop_right = crop_left + side
    crop_bottom = crop_top + side

    padded = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    source_left = max(0, crop_left)
    source_top = max(0, crop_top)
    source_right = min(master.width, crop_right)
    source_bottom = min(master.height, crop_bottom)
    region = master.crop((source_left, source_top, source_right, source_bottom))
    padded.alpha_composite(
        region,
        (source_left - crop_left, source_top - crop_top),
    )
    return padded


def _add_outer_outline(
    image: Image.Image,
    radius: int = RUNTIME_OUTLINE_RADIUS,
    color: tuple[int, int, int] = RUNTIME_OUTLINE_COLOR,
) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    outline_alpha = ImageChops.subtract(expanded, alpha)
    outlined = Image.new("RGBA", rgba.size, color + (0,))
    outlined.putalpha(outline_alpha)
    outlined.alpha_composite(rgba)
    return outlined


def export_derived_assets(
    master_path: Path,
    runtime_path: Path,
    portrait_path: Path,
    preview_path: Path,
) -> None:
    with Image.open(master_path) as source:
        master = source.convert("RGBA")

    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    portrait_path.parent.mkdir(parents=True, exist_ok=True)
    preview_path.parent.mkdir(parents=True, exist_ok=True)

    runtime_master = _add_outer_outline(master)
    runtime = runtime_master.resize((512, 512), Image.Resampling.LANCZOS)
    runtime.save(runtime_path, "WEBP", lossless=True, method=6)

    portrait = _portrait_crop(master).resize((256, 256), Image.Resampling.LANCZOS)
    portrait.save(portrait_path, "WEBP", lossless=True, method=6)

    preview = master.resize((96, 96), Image.Resampling.LANCZOS)
    preview.save(preview_path, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument(
        "--body-bbox",
        type=int,
        nargs=4,
        metavar=("LEFT", "TOP", "RIGHT", "BOTTOM"),
        required=True,
        help=(
            "source-pixel bounds of the shared hero body anchors: head, core torso, "
            "hands and feet; exclude weapons, shields and detached effects"
        ),
    )
    parser.add_argument("--master", type=Path, required=True)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--portrait", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    args = parser.parse_args()

    normalize_master(args.raw, args.master, tuple(args.body_bbox))
    export_derived_assets(
        args.master,
        args.runtime,
        args.portrait,
        args.preview,
    )


if __name__ == "__main__":
    main()
