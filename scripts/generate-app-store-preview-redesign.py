#!/usr/bin/env python3
"""Generate caption-band store screenshots for App Store and Google Play."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LOCALE = os.environ.get("STORE_SCREENSHOT_LOCALE", "en")
BEZEL_DIR = ROOT / "scripts" / "assets" / "device-bezels"
BEZEL_METADATA_PATH = BEZEL_DIR / "device-bezels.json"
EXPECTED_PLATFORMS: Dict[str, str] = {
    "iphone69": "ios",
    "android1080x2400": "android",
}

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


@dataclass(frozen=True)
class Rect:
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class BezelConfig:
    platform: str
    asset_path: Path
    screen: Rect
    outer_radius: int


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


def load_bezel_configs() -> Dict[str, BezelConfig]:
    if not BEZEL_METADATA_PATH.exists():
        raise RuntimeError(f"Missing bezel metadata: {BEZEL_METADATA_PATH.relative_to(ROOT)}")

    with BEZEL_METADATA_PATH.open("r", encoding="utf-8") as file:
        raw_configs = json.load(file)

    if not isinstance(raw_configs, dict):
        raise RuntimeError(f"{BEZEL_METADATA_PATH.relative_to(ROOT)} must contain a JSON object")

    configs: Dict[str, BezelConfig] = {}
    for base_key, expected_platform in EXPECTED_PLATFORMS.items():
        raw_config = raw_configs.get(base_key)
        if not isinstance(raw_config, dict):
            raise RuntimeError(f"Missing bezel config for {base_key!r} in {BEZEL_METADATA_PATH.relative_to(ROOT)}")

        platform = raw_config.get("platform")
        if platform != expected_platform:
            raise RuntimeError(
                f"Bezel config for {base_key!r} must use platform {expected_platform!r}, got {platform!r}"
            )

        asset = raw_config.get("asset")
        if not isinstance(asset, str) or not asset:
            raise RuntimeError(f"Bezel config for {base_key!r} must include a non-empty asset name")

        asset_path = BEZEL_DIR / asset
        if not asset_path.exists():
            raise RuntimeError(f"Missing bezel asset for {base_key!r}: {asset_path.relative_to(ROOT)}")

        raw_screen = raw_config.get("screen")
        if not isinstance(raw_screen, dict):
            raise RuntimeError(f"Bezel config for {base_key!r} must include a screen rectangle")

        try:
            screen = Rect(
                x=int(raw_screen["x"]),
                y=int(raw_screen["y"]),
                width=int(raw_screen["width"]),
                height=int(raw_screen["height"]),
            )
            outer_radius = int(raw_config.get("outerRadius", 0))
        except (KeyError, TypeError, ValueError) as error:
            raise RuntimeError(f"Invalid bezel screen rectangle for {base_key!r}") from error

        if screen.x < 0 or screen.y < 0 or screen.width <= 0 or screen.height <= 0:
            raise RuntimeError(f"Invalid non-positive bezel screen rectangle for {base_key!r}")
        if outer_radius <= 0:
            raise RuntimeError(f"Bezel config for {base_key!r} must include positive outerRadius")

        with Image.open(asset_path) as asset_image:
            asset_width, asset_height = asset_image.size
        if screen.x + screen.width > asset_width or screen.y + screen.height > asset_height:
            raise RuntimeError(f"Bezel screen rectangle for {base_key!r} exceeds {asset_path.relative_to(ROOT)}")

        configs[base_key] = BezelConfig(
            platform=platform,
            asset_path=asset_path,
            screen=screen,
            outer_radius=outer_radius,
        )

    return configs


def render_screen_content(source: Image.Image, screen_size: Tuple[int, int], slide: Dict[str, object], base_key: str) -> Image.Image:
    screen_w, screen_h = screen_size
    scale = max(screen_w / source.width, screen_h / source.height)
    scaled_w = int(round(source.width * scale))
    scaled_h = int(round(source.height * scale))
    scaled = source.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS).convert("RGBA")

    crop_top = int(get_tuned_value(slide, "crop_top", base_key, 0))
    crop_top = max(0, min(crop_top, max(0, scaled_h - screen_h)))
    crop_left = max(0, (scaled_w - screen_w) // 2)
    return scaled.crop((crop_left, crop_top, crop_left + screen_w, crop_top + screen_h))


def render_framed_device(
    source: Image.Image,
    slide: Dict[str, object],
    base_key: str,
    region_size: Tuple[int, int],
    bezel_config: BezelConfig,
) -> Image.Image:
    with Image.open(bezel_config.asset_path) as raw_bezel:
        bezel = raw_bezel.convert("RGBA")

    region_w, region_h = region_size
    scale = min(region_w / bezel.width, region_h / bezel.height)
    if scale <= 0:
        raise RuntimeError(f"Invalid device region for {base_key!r}: {region_w}x{region_h}")

    device_w = max(1, int(round(bezel.width * scale)))
    device_h = max(1, int(round(bezel.height * scale)))
    scaled_bezel = bezel.resize((device_w, device_h), Image.Resampling.LANCZOS)

    screen = Rect(
        x=int(round(bezel_config.screen.x * scale)),
        y=int(round(bezel_config.screen.y * scale)),
        width=max(1, int(round(bezel_config.screen.width * scale))),
        height=max(1, int(round(bezel_config.screen.height * scale))),
    )

    if screen.x + screen.width > device_w or screen.y + screen.height > device_h:
        raise RuntimeError(f"Scaled bezel screen rectangle for {base_key!r} exceeds rendered device bounds")

    screen_content = render_screen_content(source, (screen.width, screen.height), slide, base_key)
    device = Image.new("RGBA", (device_w, device_h), (0, 0, 0, 0))
    device.alpha_composite(screen_content, (screen.x, screen.y))
    device.alpha_composite(scaled_bezel)
    return device


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


def compose_slide(
    source_path: Path,
    output_path: Path,
    base_key: str,
    base: BaseCanvas,
    slide: Dict[str, object],
    font_path: Path,
    bezel_configs: Dict[str, BezelConfig],
) -> None:
    band_ratio = get_tuned_value(slide, "band_ratio", base_key, base.band_ratio)
    band_h = int(round(base.height * band_ratio))
    region_top = band_h + base.device_gap
    region_h = base.height - region_top
    region_w = base.width - (base.margin_x * 2)
    bezel_config = bezel_configs.get(base_key)
    if bezel_config is None:
        raise RuntimeError(f"Missing loaded bezel config for {base_key!r}")

    canvas = Image.new("RGBA", (base.width, base.height), THEME["surface"])
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, base.width, band_h), fill=THEME["background"])

    with Image.open(source_path) as raw_source:
        source = raw_source.convert("RGBA")
        if source.size != (base.width, base.height):
            raise RuntimeError(
                f"{source_path.relative_to(ROOT)} is {source.size[0]}x{source.size[1]}, expected {base.width}x{base.height}"
            )
        device = render_framed_device(source, slide, base_key, (region_w, region_h), bezel_config)

    device_x = base.margin_x + max(0, (region_w - device.width) // 2)
    device_y = region_top

    device_alpha = device.getchannel("A")
    shadow = Image.new("RGBA", device.size, (0, 0, 0, 185))
    shadow.putalpha(device_alpha.filter(ImageFilter.GaussianBlur(base.shadow_blur)))
    canvas.alpha_composite(shadow, (device_x, device_y + base.shadow_offset_y))

    canvas.alpha_composite(device, (device_x, device_y))
    draw_caption(ImageDraw.Draw(canvas), base, slide, font_path, band_h)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output_path)


def main() -> None:
    if LOCALE not in CAPTIONS:
        raise RuntimeError(f"Unsupported locale {LOCALE!r}; available: {', '.join(sorted(CAPTIONS))}")

    font_path = resolve_font_path()
    bezel_configs = load_bezel_configs()
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

            compose_slide(source_path, output_path, base_key, base, slide, font_path, bezel_configs)
            with Image.open(output_path) as image:
                print(f"{output_path.relative_to(ROOT)} {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    main()
