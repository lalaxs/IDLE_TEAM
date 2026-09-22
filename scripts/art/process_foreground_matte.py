import argparse
from pathlib import Path

from PIL import Image

from process_road_matte import clean_edge, key_mask, resize_premultiplied


MASTER_SIZE = (576, 384)
MASTER_MAX_WIDTH = 512
MASTER_MAX_HEIGHT = 320
MASTER_BASELINE_Y = 360
RUNTIME_SIZE = (288, 192)


def normalize_prop(matte_path: Path) -> Image.Image:
    with Image.open(matte_path) as matte:
        rgb = matte.convert("RGB")
    prop = clean_edge(rgb, key_mask(rgb))
    bbox = prop.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("matte image contains no foreground prop")
    prop = prop.crop(bbox)

    scale = min(
        MASTER_MAX_WIDTH / prop.width,
        MASTER_MAX_HEIGHT / prop.height,
    )
    prop = resize_premultiplied(
        prop,
        (max(1, round(prop.width * scale)), max(1, round(prop.height * scale))),
    )
    canvas = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(
        prop,
        ((MASTER_SIZE[0] - prop.width) // 2, MASTER_BASELINE_Y - prop.height),
    )
    return canvas


def process(matte_path: Path, source_path: Path, runtime_path: Path) -> None:
    source = normalize_prop(matte_path)
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
    args = parser.parse_args()
    process(args.matte, args.source, args.runtime)


if __name__ == "__main__":
    main()
