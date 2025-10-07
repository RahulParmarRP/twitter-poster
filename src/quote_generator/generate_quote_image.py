#!/usr/bin/env python3
"""
Moved version of the quote image generator.

Run this file from its directory (or call via Python -m src.quote_generator.generate_quote_image).
"""
from __future__ import annotations

import random
import textwrap
from datetime import datetime
from pathlib import Path
import sys

try:
    from PIL import Image
    from PIL import ImageFont
    from PIL import ImageDraw
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False


QUOTES = [
    "The only limit to our realization of tomorrow is our doubts of today.",
    "Do something today that your future self will thank you for.",
    "Small steps every day lead to big changes over time.",
    "Believe you can and you're halfway there.",
    "Progress, not perfection.",
    "Start where you are. Use what you have. Do what you can.",
    "Your only limit is you.",
    "Dream big. Start small. Act now.",
    "Consistency compounds into results.",
    "Be stronger than your excuses.",
]


def pick_quote() -> str:
    return random.choice(QUOTES)


def make_svg_text_block(quote: str, size: int = 1080) -> str:
    max_chars = 32
    wrapped = textwrap.fill(quote, width=max_chars)
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{size}px" height="{size}px" viewBox="0 0 {size} {size}">
  <rect width="100%" height="100%" fill="#0f172a" />
  <rect x="40" y="40" width="{size-80}" height="{size-80}" rx="40" ry="40" fill="#0b1220" opacity="0.9" />
  <g fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" font-size="48">
    <foreignObject x="80" y="120" width="{size-160}" height="{size-240}">
      <body xmlns="http://www.w3.org/1999/xhtml" style="margin:0;">
        <div style="font-size:48px; line-height:1.15; color:#ffffff; display:flex; align-items:center; justify-content:center; height:100%; text-align:center;">
          <div>{wrapped.replace('\n', '<br/>')}</div>
        </div>
      </body>
    </foreignObject>
  </g>
</svg>
'''
    return svg


def save_svg(svg: str, out_path: Path) -> None:
    out_path.write_text(svg, encoding="utf-8")


def rasterize_svg_to_png(svg_path: Path, png_path: Path, size: int = 1080, quote: str | None = None) -> bool:
    if not PIL_AVAILABLE:
        return False

    img = Image.new("RGB", (size, size), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    font = None
    possible_fonts = [
        "/Library/Fonts/Arial Unicode.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFNNSF-Regular.otf",
    ]
    for p in possible_fonts:
        try:
            font = ImageFont.truetype(p, 48)
            break
        except Exception:
            font = None

    if font is None:
        font = ImageFont.load_default()

    margin = 40
    inner_color = (11, 18, 32)
    draw.rectangle([margin, margin, size-margin, size-margin], fill=inner_color)

    # Prefer provided in-memory quote; otherwise fallback to the first quote.
    text = quote if quote is not None else QUOTES[0]

    max_chars = 32
    lines = textwrap.wrap(text, width=max_chars)

    bbox = draw.textbbox((0, 0), "A", font=font)
    line_h = bbox[3] - bbox[1]
    total_h = line_h * len(lines) + (len(lines)-1) * 6
    y = (size - total_h) // 2

    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (size - w) // 2
        draw.text((x, y), line, font=font, fill=(255, 255, 255))
        y += h + 6

    img.save(png_path)
    return True


def main():
    base = Path(__file__).resolve().parent
    out_dir = base / "outputs"
    out_dir.mkdir(exist_ok=True)

    quote = pick_quote()
    size = 1080
    svg = make_svg_text_block(quote, size=size)

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    svg_name = f"quote-{ts}.svg"
    svg_path = out_dir / svg_name
    save_svg(svg, svg_path)

    # No companion .txt file written anymore; PNG rasterizer receives quote directly.
    print(f"Saved SVG to: {svg_path}")

    png_path = out_dir / f"quote-{ts}.png"
    rasterized = rasterize_svg_to_png(svg_path, png_path, size=size, quote=quote)
    if rasterized:
        print(f"Saved PNG to: {png_path}")
    else:
        print("Pillow not available or rasterization skipped. PNG not created.")


if __name__ == "__main__":
    main()
