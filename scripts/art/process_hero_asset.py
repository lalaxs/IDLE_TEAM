import argparse
from pathlib import Path

from PIL import Image


MASTER_SIZE = 1024
MASTER_MAX_SUBJECT_WIDTH = 920
MASTER_MAX_SUBJECT_HEIGHT = 800
MASTER_BASELINE_Y = 930


def _alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("source image contains no visible alpha subject")
    return bbox


def normalize_master(source_path: Path, target_path: Path) -> None:
    with Image.open(source_path) as source:
        rgba = source.convert("RGBA")
        bbox = _alpha_bbox(rgba)
        subject = rgba.crop(bbox)

    scale = min(
        MASTER_MAX_SUBJECT_WIDTH / subject.width,
        MASTER_MAX_SUBJECT_HEIGHT / subject.height,
    )
    resized_size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    x = (MASTER_SIZE - subject.width) // 2
    y = MASTER_BASELINE_Y - subject.height
    canvas.alpha_composite(subject, (x, y))

    target_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target_path, "PNG", optimize=True)


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

    runtime = master.resize((512, 512), Image.Resampling.LANCZOS)
    runtime.save(runtime_path, "WEBP", lossless=True, method=6)

    portrait = _portrait_crop(master).resize((256, 256), Image.Resampling.LANCZOS)
    portrait.save(portrait_path, "WEBP", lossless=True, method=6)

    preview = master.resize((96, 96), Image.Resampling.LANCZOS)
    preview.save(preview_path, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument("--master", type=Path, required=True)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--portrait", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    args = parser.parse_args()

    normalize_master(args.raw, args.master)
    export_derived_assets(
        args.master,
        args.runtime,
        args.portrait,
        args.preview,
    )


if __name__ == "__main__":
    main()
