#!/usr/bin/env python3
"""Generate App Store preview redesign images from screenshots/iphone69.

Default output is the current v5 style used in Figma:
- top area retouched per slide for cleaner App Store presentation
- no synthetic top caption badge
- larger centered description text
- 1320x2868 output preserved
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT_DIR = ROOT / "screenshots" / "iphone69"
DEFAULT_OUTPUT_DIR = ROOT / "screenshots" / "iphone69_appstore_redesign_v5"

W, H = 1320, 2868
MARGIN_X = 92
SAFE_TOP = 180

PALETTE: Dict[str, str] = {
    "cream": "#F7E9D7",
    "gold": "#F0D36D",
    "gold_soft": "#E6C45C",
    "brown_dark": "#1D181A",
    "rose": "#D8A7A6",
    "plum": "#6A63ED",
    "white": "#FFF8F1",
}

SLIDES: List[Dict[str, object]] = [
    {
        "src": "rooms-home.png",
        "dst": "01-rooms-home-preview-v5.png",
        "eyebrow": "QUICK START",
        "headline": ["Start your", "next game fast"],
        "sub": "Create or join a room in a few taps and keep your table moving.",
        "accent": PALETTE["gold"],
        "center_all": True,
        "retouch_tint": "#1a1416",
    },
    {
        "src": "join-room.png",
        "dst": "02-join-room-preview-v5.png",
        "eyebrow": "INSTANT ACCESS",
        "headline": ["Join a room", "in seconds"],
        "sub": "Drop in with a code, skip setup friction, and get straight to play.",
        "accent": PALETTE["rose"],
        "center_all": False,
        "retouch_tint": "#191315",
    },
    {
        "src": "room-view.png",
        "dst": "03-room-view-preview-v5.png",
        "eyebrow": "LIVE TABLE VIEW",
        "headline": ["Track every", "player update"],
        "sub": "Watch the complete table in real time and see everyone's changes instantly.",
        "accent": PALETTE["plum"],
        "center_all": False,
        "retouch_tint": "#171427",
    },
    {
        "src": "character-details.png",
        "dst": "04-character-details-preview-v5.png",
        "eyebrow": "FAST STAT CONTROL",
        "headline": ["Edit stats", "without slowing down"],
        "sub": "Update levels, power, class, and race from one focused character sheet.",
        "accent": PALETTE["gold_soft"],
        "center_all": False,
        "retouch_tint": "#1a1312",
    },
]


def resolve_font_path() -> Path:
    candidates = [
        Path("/System/Library/Fonts/Avenir Next.ttc"),
        Path("/System/Library/Fonts/Supplemental/Avenir Next.ttc"),
        Path("/System/Library/Fonts/Helvetica.ttc"),
        Path("/System/Library/Fonts/Supplemental/Helvetica.ttc"),
        Path("/Library/Fonts/Arial.ttf"),
    ]

    for candidate in candidates:
        if candidate.exists():
            try:
                ImageFont.truetype(str(candidate), 40)
                return candidate
            except Exception:
                continue

    raise RuntimeError("No loadable system font found")


def wrap_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, font: ImageFont.FreeTypeFont) -> List[str]:
    words = text.split()
    lines: List[str] = []
    current = ""

    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word

    if current:
        lines.append(current)

    return lines


def main() -> None:
    font_path = resolve_font_path()

    eyebrow_font = ImageFont.truetype(str(font_path), 34)
    headline_font = ImageFont.truetype(str(font_path), 104)
    sub_font = ImageFont.truetype(str(font_path), 48)

    output_dir = DEFAULT_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    for slide in SLIDES:
        src_path = DEFAULT_INPUT_DIR / str(slide["src"])
        dst_path = output_dir / str(slide["dst"])

        img = Image.open(src_path).convert("RGBA").resize((W, H), Image.Resampling.LANCZOS)
        canvas = img.copy()

        dim = Image.new("RGBA", (W, H), "#0E0B0D")
        dim.putalpha(58)
        canvas.alpha_composite(dim)

        grad = Image.new("L", (1, H), 0)
        for y in range(H):
            alpha = int(232 * (1 - (y / 1220)) ** 0.74) if y <= 1220 else 0
            grad.putpixel((0, y), alpha)
        grad = grad.resize((W, H))

        top_scrim = Image.new("RGBA", (W, H), PALETTE["brown_dark"])
        top_scrim.putalpha(grad)
        canvas.alpha_composite(top_scrim)

        # Retouch the app chrome at the very top for cleaner App Store visuals.
        retouch = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        rdraw = ImageDraw.Draw(retouch)
        rdraw.rounded_rectangle((36, 32, W - 36, 338), radius=62, fill=str(slide["retouch_tint"]))
        retouch = retouch.filter(ImageFilter.GaussianBlur(18))
        retouch.putalpha(retouch.getchannel("A").point(lambda a: min(a, 210)))
        canvas.alpha_composite(retouch)

        sheen = Image.new("L", (1, H), 0)
        for y in range(H):
            a = int(84 * (1 - y / 300)) if y < 300 else 0
            sheen.putpixel((0, y), a)
        sheen = sheen.resize((W, H))
        sheen_layer = Image.new("RGBA", (W, H), "#FFFFFF")
        sheen_layer.putalpha(sheen)
        canvas.alpha_composite(sheen_layer)

        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        gdraw.ellipse((-250, SAFE_TOP - 140, 650, SAFE_TOP + 500), fill=str(slide["accent"]))
        glow = glow.filter(ImageFilter.GaussianBlur(120))
        glow.putalpha(glow.getchannel("A").point(lambda a: min(a, 95)))
        canvas.alpha_composite(glow)

        draw = ImageDraw.Draw(canvas)

        if bool(slide["center_all"]):
            center_x = W // 2
            y = 930
            eyebrow = str(slide["eyebrow"])
            ew = draw.textlength(eyebrow, font=eyebrow_font)
            draw.text((center_x - ew / 2, y), eyebrow, font=eyebrow_font, fill=str(slide["accent"]))

            y += 88
            for line in slide["headline"]:  # type: ignore[index]
                lw = draw.textlength(str(line), font=headline_font)
                draw.text((center_x - lw / 2, y), str(line), font=headline_font, fill=PALETTE["white"])
                y += 118

            sub_lines = wrap_text(draw, str(slide["sub"]), 980, sub_font)
            box_h = 76 + 58 * len(sub_lines)
            box_top = y + 20
            draw.rounded_rectangle((160, box_top, W - 160, box_top + box_h), radius=36, fill=(20, 16, 19, 162), outline=(255, 248, 241, 62), width=2)

            sy = box_top + 28
            for line in sub_lines[:3]:
                lw = draw.textlength(line, font=sub_font)
                draw.text((center_x - lw / 2, sy), line, font=sub_font, fill=PALETTE["cream"])
                sy += 58
        else:
            eyebrow_y = SAFE_TOP + 18
            draw.text((MARGIN_X, eyebrow_y), str(slide["eyebrow"]), font=eyebrow_font, fill=str(slide["accent"]))

            head_y = eyebrow_y + 64
            for line in slide["headline"]:  # type: ignore[index]
                draw.text((MARGIN_X - 2, head_y), str(line), font=headline_font, fill=PALETTE["white"])
                head_y += 114

            sub_lines = wrap_text(draw, str(slide["sub"]), 1040, sub_font)
            box_h = 78 + 58 * len(sub_lines)
            sub_top = head_y + 28
            sub_box = (140, sub_top, W - 140, sub_top + box_h)
            draw.rounded_rectangle(sub_box, radius=36, fill=(20, 16, 19, 162), outline=(255, 248, 241, 62), width=2)

            center_x = W // 2
            sy = sub_top + 28
            for line in sub_lines[:3]:
                lw = draw.textlength(line, font=sub_font)
                draw.text((center_x - lw / 2, sy), line, font=sub_font, fill=PALETTE["cream"])
                sy += 58

        canvas.save(dst_path)

    print(f"FONT {font_path}")
    for path in sorted(output_dir.glob("*.png")):
        with Image.open(path) as image:
            print(f"{path.relative_to(ROOT)} {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    main()
