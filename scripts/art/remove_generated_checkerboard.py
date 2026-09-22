from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def _is_neutral_background(
    pixel: tuple[int, int, int, int],
    *,
    neutral_range: int,
    min_channel: int,
) -> bool:
    red, green, blue, _ = pixel
    return (
        max(red, green, blue) - min(red, green, blue) <= neutral_range
        and min(red, green, blue) >= min_channel
    )


def remove_checkerboard(
    source: Path,
    target: Path,
    *,
    neutral_range: int = 24,
    min_channel: int = 70,
) -> None:
    with Image.open(source) as image:
        rgba = image.convert("RGBA")

    width, height = rgba.size
    pixels = rgba.load()
    background = bytearray(width * height)
    pending: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if background[index] or not _is_neutral_background(
            pixels[x, y],
            neutral_range=neutral_range,
            min_channel=min_channel,
        ):
            return
        background[index] = 1
        pending.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while pending:
        x, y = pending.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    for index, is_background in enumerate(background):
        if not is_background:
            continue
        x = index % width
        y = index // width
        pixels[x, y] = (0, 0, 0, 0)

    target.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(target, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove a generated neutral checkerboard connected to the canvas edge."
    )
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--neutral-range", type=int, default=24)
    parser.add_argument("--min-channel", type=int, default=70)
    args = parser.parse_args()
    remove_checkerboard(
        args.source,
        args.target,
        neutral_range=args.neutral_range,
        min_channel=args.min_channel,
    )


if __name__ == "__main__":
    main()
