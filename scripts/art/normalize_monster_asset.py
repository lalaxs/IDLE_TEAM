import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


MASTER_SIZE = 1024
BASELINE_Y = 930
ALPHA_THRESHOLD = 8
OUTLINE_RADIUS = 18
OUTLINE_COLOR = (45, 36, 20)
ROLE_BOUNDS = {
    "normal": (620, 560),
    "elite": (720, 650),
    "boss": (880, 780),
}
SIZE_TIER_SCALE = {
    "compact": 0.88,
    "standard": 1.0,
}


def add_shared_outer_outline(subject: Image.Image) -> Image.Image:
    padding = OUTLINE_RADIUS
    padded = Image.new(
        "RGBA",
        (subject.width + padding * 2, subject.height + padding * 2),
        (0, 0, 0, 0),
    )
    padded.alpha_composite(subject, (padding, padding))
    alpha = padded.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(padding * 2 + 1))
    outline_alpha = ImageChops.subtract(expanded, alpha)
    outline = Image.new("RGBA", padded.size, OUTLINE_COLOR + (0,))
    outline.putalpha(outline_alpha)
    outline.alpha_composite(padded)
    return outline


def normalize_monster(
    source_path: Path,
    target_path: Path,
    role: str,
    size_tier: str,
) -> tuple[float, float, float]:
    with Image.open(source_path) as source:
        rgba = source.convert("RGBA")
        alpha = rgba.getchannel("A").point(
            lambda value: 0 if value < ALPHA_THRESHOLD else value,
        )
        rgba.putalpha(alpha)
        bbox = alpha.getbbox()
        if bbox is None:
            raise ValueError("source image contains no visible alpha subject")
        subject = rgba.crop(bbox)

    role_width, role_height = ROLE_BOUNDS[role]
    tier_scale = SIZE_TIER_SCALE[size_tier]
    target_width = round(role_width * tier_scale)
    target_height = round(role_height * tier_scale)
    inner_width = target_width - OUTLINE_RADIUS * 2
    inner_height = target_height - OUTLINE_RADIUS * 2
    scale = min(inner_width / subject.width, inner_height / subject.height)
    subject = subject.resize(
        (
            max(1, round(subject.width * scale)),
            max(1, round(subject.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    subject = add_shared_outer_outline(subject)
    subject_alpha_bbox = subject.getchannel("A").point(
        lambda value: 255 if value >= ALPHA_THRESHOLD else 0,
    ).getbbox()
    if subject_alpha_bbox is None:
        raise ValueError("outlined subject contains no visible alpha pixels")

    canvas = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    x = (MASTER_SIZE - subject.width) // 2
    y = BASELINE_Y - subject_alpha_bbox[3]
    canvas.alpha_composite(subject, (x, y))

    target_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target_path, "PNG", optimize=True)

    alpha_bbox = canvas.getchannel("A").point(
        lambda value: 255 if value >= ALPHA_THRESHOLD else 0,
    ).getbbox()
    if alpha_bbox is None:
        raise ValueError("normalized image contains no visible alpha subject")
    left, top, right, bottom = alpha_bbox
    return (
        (right - left) / MASTER_SIZE,
        (bottom - top) / MASTER_SIZE,
        bottom / MASTER_SIZE,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--role", choices=ROLE_BOUNDS, required=True)
    parser.add_argument(
        "--size-tier",
        choices=SIZE_TIER_SCALE,
        default="standard",
    )
    args = parser.parse_args()

    visible_width, visible_height, foot_y = normalize_monster(
        args.raw,
        args.out,
        args.role,
        args.size_tier,
    )
    print(
        f"{args.out.name}: visibleWidthRatio={visible_width:.3f}, "
        f"visibleHeightRatio={visible_height:.3f}, footY={foot_y:.3f}"
    )


if __name__ == "__main__":
    main()
