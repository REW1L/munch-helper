#!/usr/bin/env python3
"""Generate App Store preview redesign images from screenshots/iphone* variants.

Default output is the current v5 style used in Figma:
- top area retouched per slide for cleaner App Store presentation
- no synthetic top caption badge
- larger centered description text
- output resolution preserved per source variant
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
BASE_W, BASE_H = 1320, 2868
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

    source_dirs = sorted(
        directory
        for directory in (ROOT / "screenshots").glob("iphone*")
        if directory.is_dir() and "_appstore_redesign" not in directory.name
    )

    print(f"FONT {font_path}")

    for source_dir in source_dirs:
        size_probe = source_dir / str(SLIDES[0]["src"])
        if not size_probe.exists():
            print(f"SKIP {source_dir.relative_to(ROOT)} (missing {size_probe.name})")
            continue

        with Image.open(size_probe) as probe:
            width, height = probe.size

        scale_x = width / BASE_W
        scale_y = height / BASE_H
        scale = min(scale_x, scale_y)

        def sx(value: int) -> int:
            return max(1, int(round(value * scale_x)))

        def sy(value: int) -> int:
            return max(1, int(round(value * scale_y)))

        def ss(value: int) -> int:
            return max(1, int(round(value * scale)))

        eyebrow_font = ImageFont.truetype(str(font_path), ss(34))
        headline_font = ImageFont.truetype(str(font_path), ss(104))
        sub_font = ImageFont.truetype(str(font_path), ss(48))

        output_dir = source_dir.with_name(f"{source_dir.name}_appstore_redesign_v5")
        output_dir.mkdir(parents=True, exist_ok=True)

        for slide in SLIDES:
            src_path = source_dir / str(slide["src"])
            dst_path = output_dir / str(slide["dst"])

            if not src_path.exists():
                print(f"SKIP {src_path.relative_to(ROOT)} (missing)")
                continue

            img = Image.open(src_path).convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
            canvas = img.copy()

            dim = Image.new("RGBA", (width, height), "#0E0B0D")
            dim.putalpha(58)
            canvas.alpha_composite(dim)

            grad = Image.new("L", (1, height), 0)
            fade_limit = sy(1220)
            for y in range(height):
                alpha = int(232 * (1 - (y / fade_limit)) ** 0.74) if y <= fade_limit else 0
                grad.putpixel((0, y), alpha)
            grad = grad.resize((width, height))

            top_scrim = Image.new("RGBA", (width, height), PALETTE["brown_dark"])
            top_scrim.putalpha(grad)
            canvas.alpha_composite(top_scrim)

            # Retouch the app chrome at the very top for cleaner App Store visuals.
            retouch = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            rdraw = ImageDraw.Draw(retouch)
            rdraw.rounded_rectangle((sx(36), sy(32), width - sx(36), sy(338)), radius=ss(62), fill=str(slide["retouch_tint"]))
            retouch = retouch.filter(ImageFilter.GaussianBlur(ss(18)))
            retouch.putalpha(retouch.getchannel("A").point(lambda a: min(a, 210)))
            canvas.alpha_composite(retouch)

            sheen = Image.new("L", (1, height), 0)
            sheen_limit = sy(300)
            for y in range(height):
                a = int(84 * (1 - y / sheen_limit)) if y < sheen_limit else 0
                sheen.putpixel((0, y), a)
            sheen = sheen.resize((width, height))
            sheen_layer = Image.new("RGBA", (width, height), "#FFFFFF")
            sheen_layer.putalpha(sheen)
            canvas.alpha_composite(sheen_layer)

            glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            gdraw = ImageDraw.Draw(glow)
            gdraw.ellipse((sx(-250), sy(SAFE_TOP - 140), sx(650), sy(SAFE_TOP + 500)), fill=str(slide["accent"]))
            glow = glow.filter(ImageFilter.GaussianBlur(ss(120)))
            glow.putalpha(glow.getchannel("A").point(lambda a: min(a, 95)))
            canvas.alpha_composite(glow)

            draw = ImageDraw.Draw(canvas)

            if bool(slide["center_all"]):
                center_x = width // 2
                y = sy(930)
                eyebrow = str(slide["eyebrow"])
                ew = draw.textlength(eyebrow, font=eyebrow_font)
                draw.text((center_x - ew / 2, y), eyebrow, font=eyebrow_font, fill=str(slide["accent"]))

                y += sy(88)
                for line in slide["headline"]:  # type: ignore[index]
                    lw = draw.textlength(str(line), font=headline_font)
                    draw.text((center_x - lw / 2, y), str(line), font=headline_font, fill=PALETTE["white"])
                    y += sy(118)

                sub_lines = wrap_text(draw, str(slide["sub"]), sx(980), sub_font)
                box_h = sy(76) + sy(58) * len(sub_lines)
                box_top = y + sy(20)
                draw.rounded_rectangle(
                    (sx(160), box_top, width - sx(160), box_top + box_h),
                    radius=ss(36),
                    fill=(20, 16, 19, 162),
                    outline=(255, 248, 241, 62),
                    width=ss(2),
                )

                text_y = box_top + sy(28)
                for line in sub_lines[:3]:
                    lw = draw.textlength(line, font=sub_font)
                    draw.text((center_x - lw / 2, text_y), line, font=sub_font, fill=PALETTE["cream"])
                    text_y += sy(58)
            else:
                eyebrow_y = sy(SAFE_TOP + 18)
                draw.text((sx(MARGIN_X), eyebrow_y), str(slide["eyebrow"]), font=eyebrow_font, fill=str(slide["accent"]))

                head_y = eyebrow_y + sy(64)
                for line in slide["headline"]:  # type: ignore[index]
                    draw.text((sx(MARGIN_X - 2), head_y), str(line), font=headline_font, fill=PALETTE["white"])
                    head_y += sy(114)

                sub_lines = wrap_text(draw, str(slide["sub"]), sx(1040), sub_font)
                box_h = sy(78) + sy(58) * len(sub_lines)
                sub_top = head_y + sy(28)
                sub_box = (sx(140), sub_top, width - sx(140), sub_top + box_h)
                draw.rounded_rectangle(
                    sub_box,
                    radius=ss(36),
                    fill=(20, 16, 19, 162),
                    outline=(255, 248, 241, 62),
                    width=ss(2),
                )

                center_x = width // 2
                text_y = sub_top + sy(28)
                for line in sub_lines[:3]:
                    lw = draw.textlength(line, font=sub_font)
                    draw.text((center_x - lw / 2, text_y), line, font=sub_font, fill=PALETTE["cream"])
                    text_y += sy(58)

            # Save as RGB so the exported PNGs do not include an alpha channel.
            canvas.convert("RGB").save(dst_path)

        for path in sorted(output_dir.glob("*.png")):
            with Image.open(path) as image:
                print(f"{path.relative_to(ROOT)} {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    main()
