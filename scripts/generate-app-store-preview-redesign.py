#!/usr/bin/env python3
"""Generate caption-band store screenshots for App Store and Google Play."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LOCALE = os.environ.get("STORE_SCREENSHOT_LOCALE", "en")

# Mirrored from frontend/constants/theme.ts. Keep this dict in sync with
# AppTheme.colors when the app palette changes.
THEME: Dict[str, str] = {
    "background": "#3C3636",
    "surface": "#473F3F",
    "elevated": "#4C4545",
    "accent": "#D4C26E",
    "textPrimary": "#FFFFFF",
    "textMuted": "#D9D9D9",
    "textAccentSoft": "#E8D89A",
    "danger": "#922525",
    "actionSecondary": "#6E6BD4",
    "surfaceWarm": "#8A6150",
    "surfaceSubtle": "#353535",
    "parchmentSurface": "#D2ACAC",
    "parchmentText": "#CEB464",
    "parchmentTextShadow": "#796834",
}


@dataclass(frozen=True)
class BaseCanvas:
    width: int
    height: int
    band_ratio: float
    margin_x: int
    device_gap: int
    corner_radius: int
    shadow_blur: int
    shadow_offset_y: int
    eyebrow_size: int
    headline_size: int
    sub_size: int
    headline_leading: int
    sub_leading: int


BASES: Dict[str, BaseCanvas] = {
    "iphone69": BaseCanvas(
        width=1320,
        height=2868,
        band_ratio=0.255,
        margin_x=92,
        device_gap=34,
        corner_radius=58,
        shadow_blur=46,
        shadow_offset_y=22,
        eyebrow_size=34,
        headline_size=92,
        sub_size=42,
        headline_leading=102,
        sub_leading=52,
    ),
    "android1080x2400": BaseCanvas(
        width=1080,
        height=2400,
        band_ratio=0.265,
        margin_x=76,
        device_gap=28,
        corner_radius=48,
        shadow_blur=38,
        shadow_offset_y=18,
        eyebrow_size=30,
        headline_size=76,
        sub_size=36,
        headline_leading=84,
        sub_leading=44,
    ),
}


CAPTIONS: Dict[str, Dict[str, Dict[str, object]]] = {
    "en": {
        "rooms-home": {
            "src": "rooms-home.png",
            "dst": "01-rooms-home.png",
            "eyebrow": "GATHER THE TABLE",
            "headline": ["One room for", "the whole party"],
            "sub": "Create a shared table and keep everyone in sync from the first move.",
            "accent": "accent",
            "band_ratio": {"iphone69": 0.25, "android1080x2400": 0.26},
            "crop_top": {"iphone69": 0, "android1080x2400": 0},
        },
        "room-view": {
            "src": "room-view.png",
            "dst": "02-room-view.png",
            "eyebrow": "LIVE TABLE",
            "headline": ["Watch everyone", "level up"],
            "sub": "Track power, class, and race changes while the table keeps moving.",
            "accent": "actionSecondary",
            "band_ratio": {"iphone69": 0.255, "android1080x2400": 0.265},
            "crop_top": {"iphone69": 0, "android1080x2400": 0},
        },
        "battle": {
            "src": "battle.png",
            "dst": "03-battle.png",
            "eyebrow": "INTO BATTLE",
            "headline": ["Take on the", "monster together"],
            "sub": "Pull in allies, stack bonuses, and settle the fight as a group.",
            "accent": "danger",
            "band_ratio": {"iphone69": 0.265, "android1080x2400": 0.275},
            "crop_top": {"iphone69": 0, "android1080x2400": 0},
        },
        "log": {
            "src": "log.png",
            "dst": "04-log.png",
            "eyebrow": "GAME HISTORY",
            "headline": ["Replay every", "twist"],
            "sub": "Review battles and table updates long after the cards hit the table.",
            "accent": "parchmentText",
            "band_ratio": {"iphone69": 0.25, "android1080x2400": 0.26},
            "crop_top": {"iphone69": 0, "android1080x2400": 0},
        },
    }
}


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
            continue

        if current:
            lines.append(current)
        current = word

    if current:
        lines.append(current)

    return lines


def rounded_mask(size: Tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def render_device_shot(source: Image.Image, base: BaseCanvas, slide: Dict[str, object], base_key: str) -> Image.Image:
    band_ratio = get_tuned_value(slide, "band_ratio", base_key, base.band_ratio)
    band_h = int(round(base.height * band_ratio))
    region_top = band_h + base.device_gap
    region_h = base.height - region_top
    region_w = base.width - (base.margin_x * 2)
    scale = region_w / source.width
    scaled_h = int(round(source.height * scale))
    scaled = source.resize((region_w, scaled_h), Image.Resampling.LANCZOS).convert("RGBA")

    crop_top = int(get_tuned_value(slide, "crop_top", base_key, 0))
    crop_top = max(0, min(crop_top, max(0, scaled_h - 1)))
    crop_bottom = min(scaled_h, crop_top + region_h)
    visible = scaled.crop((0, crop_top, region_w, crop_bottom))

    if visible.height < region_h:
        padded = Image.new("RGBA", (region_w, region_h), (0, 0, 0, 0))
        padded.alpha_composite(visible, (0, 0))
        visible = padded

    return visible


def get_tuned_value(slide: Dict[str, object], key: str, base_key: str, default: float) -> float:
    value = slide.get(key)
    if isinstance(value, dict):
        tuned = value.get(base_key)
        if isinstance(tuned, (int, float)):
            return float(tuned)
    if isinstance(value, (int, float)):
        return float(value)
    return default


def draw_caption(
    draw: ImageDraw.ImageDraw,
    base: BaseCanvas,
    slide: Dict[str, object],
    font_path: Path,
    band_h: int,
) -> None:
    eyebrow_font = ImageFont.truetype(str(font_path), base.eyebrow_size)
    headline_font = ImageFont.truetype(str(font_path), base.headline_size)
    sub_font = ImageFont.truetype(str(font_path), base.sub_size)
    accent = THEME[str(slide["accent"])]
    x = base.margin_x
    max_width = base.width - (base.margin_x * 2)
    headline_lines = [str(line) for line in slide["headline"]]  # type: ignore[index]
    sub_lines = wrap_text(draw, str(slide["sub"]), max_width, sub_font)[:2]

    text_h = (
        base.eyebrow_size
        + 28
        + (len(headline_lines) * base.headline_leading)
        + 18
        + (len(sub_lines) * base.sub_leading)
    )
    y = max(38, (band_h - text_h) // 2)

    draw.text((x, y), str(slide["eyebrow"]), font=eyebrow_font, fill=accent)
    y += base.eyebrow_size + 28

    for line in headline_lines:
        draw.text((x - 2, y), line, font=headline_font, fill=THEME["textPrimary"])
        y += base.headline_leading

    y += 12
    for line in sub_lines:
        draw.text((x, y), line, font=sub_font, fill=THEME["textMuted"])
        y += base.sub_leading


def compose_slide(source_path: Path, output_path: Path, base_key: str, base: BaseCanvas, slide: Dict[str, object], font_path: Path) -> None:
    band_ratio = get_tuned_value(slide, "band_ratio", base_key, base.band_ratio)
    band_h = int(round(base.height * band_ratio))
    region_top = band_h + base.device_gap

    canvas = Image.new("RGBA", (base.width, base.height), THEME["surface"])
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, base.width, band_h), fill=THEME["background"])
    draw.rectangle((0, band_h - 2, base.width, band_h + 2), fill=THEME[str(slide["accent"])])

    with Image.open(source_path) as raw_source:
        source = raw_source.convert("RGBA")
        if source.size != (base.width, base.height):
            raise RuntimeError(
                f"{source_path.relative_to(ROOT)} is {source.size[0]}x{source.size[1]}, expected {base.width}x{base.height}"
            )
        device = render_device_shot(source, base, slide, base_key)

    device_x = base.margin_x
    device_y = region_top
    mask = rounded_mask(device.size, base.corner_radius)

    shadow = Image.new("RGBA", device.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((0, 0, device.width, device.height), radius=base.corner_radius, fill=(0, 0, 0, 190))
    shadow = shadow.filter(ImageFilter.GaussianBlur(base.shadow_blur))
    canvas.alpha_composite(shadow, (device_x, device_y + base.shadow_offset_y))

    glow = Image.new("RGBA", device.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    accent_rgb = Image.new("RGBA", (1, 1), THEME[str(slide["accent"])]).getpixel((0, 0))
    glow_draw.rounded_rectangle(
        (0, 0, device.width, device.height),
        radius=base.corner_radius,
        outline=accent_rgb[:3] + (128,),
        width=max(8, base.width // 90),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(base.shadow_blur // 2))
    canvas.alpha_composite(glow, (device_x, device_y))

    canvas.paste(device, (device_x, device_y), mask)
    boundary = ImageDraw.Draw(canvas)
    boundary.rounded_rectangle(
        (device_x - 3, device_y - 3, device_x + device.width + 3, device_y + device.height + 3),
        radius=base.corner_radius + 3,
        outline=THEME["textAccentSoft"],
        width=max(4, base.width // 180),
    )
    boundary.rounded_rectangle(
        (device_x, device_y, device_x + device.width - 1, device_y + device.height - 1),
        radius=base.corner_radius,
        outline=THEME[str(slide["accent"])],
        width=max(3, base.width // 240),
    )
    draw_caption(ImageDraw.Draw(canvas), base, slide, font_path, band_h)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output_path)


def main() -> None:
    if LOCALE not in CAPTIONS:
        raise RuntimeError(f"Unsupported locale {LOCALE!r}; available: {', '.join(sorted(CAPTIONS))}")

    font_path = resolve_font_path()
    print(f"FONT {font_path}")

    for base_key, base in BASES.items():
        source_dir = ROOT / "screenshots" / base_key
        if not source_dir.is_dir():
            print(f"SKIP screenshots/{base_key} (missing directory)")
            continue

        output_dir = ROOT / "screenshots" / f"{base_key}_store_preview" / LOCALE
        for slide_key, slide in CAPTIONS[LOCALE].items():
            source_path = source_dir / str(slide["src"])
            output_path = output_dir / str(slide["dst"])
            if not source_path.exists():
                print(f"SKIP {source_path.relative_to(ROOT)} (missing)")
                continue

            compose_slide(source_path, output_path, base_key, base, slide, font_path)
            with Image.open(output_path) as image:
                print(f"{output_path.relative_to(ROOT)} {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    main()
