import argparse
from pathlib import Path
from statistics import median

from PIL import Image, ImageChops, ImageFilter


MATTE_COLOR = (255, 0, 255)
RUNTIME_SIZE = (1720, 560)


def key_mask(rgb: Image.Image) -> Image.Image:
    matte = Image.new("RGB", rgb.size, MATTE_COLOR)
    red, green, blue = ImageChops.difference(rgb, matte).split()
    distance = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    mask = distance.point(lambda value: 255 if value >= 48 else 0)
    cleaned = Image.new("L", rgb.size)
    cleaned.putdata([
        0
        if source_red >= 96
        and source_blue >= 96
        and min(source_red, source_blue) - source_green >= 42
        and abs(source_red - source_blue) <= 110
        else value
        for (source_red, source_green, source_blue), value in zip(
            rgb.get_flattened_data(), mask.get_flattened_data()
        )
    ])
    return cleaned


def clean_edge(rgb: Image.Image, mask: Image.Image) -> Image.Image:
    solid = mask.filter(ImageFilter.MinFilter(3))
    alpha = solid.filter(ImageFilter.GaussianBlur(0.7))
    alpha = alpha.point(
        lambda value: 0 if value < 4 else 255 if value > 251 else value
    )

    artwork = rgb.convert("RGBA")
    artwork.putalpha(solid)
    bleed = (
        artwork.convert("RGBa")
        .filter(ImageFilter.GaussianBlur(1.4))
        .convert("RGBA")
    )
    output_rgb = Image.composite(rgb, bleed.convert("RGB"), solid)
    output = output_rgb.convert("RGBA")
    output.putalpha(alpha)
    return output.convert("RGBa").convert("RGBA")


def resize_premultiplied(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_ratio = size[0] / size[1]
    source_ratio = image.width / image.height
    if source_ratio < target_ratio:
        crop_height = round(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    elif source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    output = (
        image.convert("RGBa")
        .resize(size, Image.Resampling.LANCZOS)
        .convert("RGBA")
    )
    alpha = output.getchannel("A").point(
        lambda value: 0 if value < 4 else 255 if value > 251 else value
    )
    output.putalpha(alpha)
    return output.convert("RGBa").convert("RGBA")


def normalize_ground_height(image: Image.Image, top_ratio: float) -> Image.Image:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    column_tops = []
    for x in range(alpha.width):
        for y in range(alpha.height):
            if pixels[x, y] > 8:
                column_tops.append(y)
                break
    if not column_tops:
        return image

    current_top = median(column_tops)
    target_top = image.height * top_ratio
    scale_y = (image.height - target_top) / (image.height - current_top)
    resized_height = max(1, round(image.height * scale_y))
    resized = (
        image.convert("RGBa")
        .resize((image.width, resized_height), Image.Resampling.LANCZOS)
        .convert("RGBA")
    )
    output = Image.new("RGBA", image.size)
    output.alpha_composite(resized, (0, image.height - resized_height))
    return output.convert("RGBa").convert("RGBA")


def process(
    matte_path: Path,
    source_path: Path,
    runtime_path: Path,
    ground_top_ratio: float | None = None,
) -> None:
    with Image.open(matte_path) as matte:
        rgb = matte.convert("RGB")

    source = clean_edge(rgb, key_mask(rgb))
    if ground_top_ratio is not None:
        source = normalize_ground_height(source, ground_top_ratio)
    source_path.parent.mkdir(parents=True, exist_ok=True)
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    source.save(source_path, "PNG", optimize=True)
    resize_premultiplied(source, RUNTIME_SIZE).save(
        runtime_path,
        "WEBP",
        lossless=True,
        method=6,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--matte", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--ground-top-ratio", type=float)
    args = parser.parse_args()
    process(args.matte, args.source, args.runtime, args.ground_top_ratio)


if __name__ == "__main__":
    main()
