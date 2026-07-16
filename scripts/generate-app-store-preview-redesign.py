#!/usr/bin/env python3
"""Generate caption-band store screenshots for App Store and Google Play."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LOCALE = os.environ.get("STORE_SCREENSHOT_LOCALE", "en")
BEZEL_DIR = ROOT / "scripts" / "assets" / "device-bezels"
BEZEL_METADATA_PATH = BEZEL_DIR / "device-bezels.json"
STORE_LOCALES_PATH = ROOT / "scripts" / "store-screenshot-locales.json"
STORE_ASSETS_DIR = ROOT / "docs" / "store-assets" / "app-store"
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


SLIDES: Dict[str, Dict[str, object]] = {
    "rooms-home": {"src": "rooms-home.png", "dst": "01-rooms-home.png", "accent": "accent", "band_ratio": {"iphone69": 0.25, "android1080x2400": 0.26}},
    "room-view": {"src": "room-view.png", "dst": "02-room-view.png", "accent": "actionSecondary", "band_ratio": {"iphone69": 0.255, "android1080x2400": 0.265}},
    "battle": {"src": "battle.png", "dst": "03-battle.png", "accent": "danger", "band_ratio": {"iphone69": 0.265, "android1080x2400": 0.275}},
    "log": {"src": "log.png", "dst": "04-log.png", "accent": "parchmentText", "band_ratio": {"iphone69": 0.25, "android1080x2400": 0.26}},
}

# Caption text is intentionally the only locale-specific screenshot data.
CAPTIONS: Dict[str, Dict[str, Dict[str, str]]] = {
    "en": {"rooms-home": {"eyebrow": "GATHER THE TABLE", "headline": "One room for the whole party", "sub": "Create a shared table and keep everyone in sync from the first move."}, "room-view": {"eyebrow": "LIVE TABLE", "headline": "Watch everyone level up", "sub": "Track power, class, and race changes while the table keeps moving."}, "battle": {"eyebrow": "INTO BATTLE", "headline": "Take on the monster together", "sub": "Pull in allies, stack bonuses, and settle the fight as a group."}, "log": {"eyebrow": "GAME HISTORY", "headline": "Replay every twist", "sub": "Review battles and table updates long after the cards hit the table."}},
    "pl": {"rooms-home": {"eyebrow": "ZBIERZ DRUŻYNĘ", "headline": "Jeden pokój dla całej ekipy", "sub": "Stwórz wspólny stół i bądźcie zsynchronizowani od pierwszego ruchu."}, "room-view": {"eyebrow": "STÓŁ NA ŻYWO", "headline": "Obserwuj rozwój całej drużyny", "sub": "Śledź siłę, klasę i rasę, gdy gra toczy się dalej."}, "battle": {"eyebrow": "DO WALKI", "headline": "Zmierzcie się z potworem razem", "sub": "Dobieraj sojuszników, dodawaj premie i rozstrzygnijcie walkę wspólnie."}, "log": {"eyebrow": "HISTORIA GRY", "headline": "Odtwórz każdy zwrot akcji", "sub": "Przeglądaj walki i zmiany przy stole długo po rozdaniu kart."}},
    "de": {"rooms-home": {"eyebrow": "ALLE AN DEN TISCH", "headline": "Ein Raum für die ganze Runde", "sub": "Erstellt einen gemeinsamen Tisch und bleibt vom ersten Zug an synchron."}, "room-view": {"eyebrow": "LIVE AM TISCH", "headline": "Sieh alle aufsteigen", "sub": "Behalte Stärke, Klasse und Rasse im Blick, während die Runde läuft."}, "battle": {"eyebrow": "AB IN DEN KAMPF", "headline": "Stellt euch gemeinsam dem Monster", "sub": "Holt Verbündete dazu, stapelt Boni und entscheidet den Kampf zusammen."}, "log": {"eyebrow": "SPIELVERLAUF", "headline": "Erlebe jede Wendung noch einmal", "sub": "Sieh Kämpfe und Änderungen am Tisch nach, lange nachdem die Karten liegen."}},
    "fr": {"rooms-home": {"eyebrow": "RASSEMBLEZ LA TABLE", "headline": "Une salle pour toute la partie", "sub": "Créez une table partagée et restez synchronisés dès le premier tour."}, "room-view": {"eyebrow": "TABLE EN DIRECT", "headline": "Voyez tout le monde progresser", "sub": "Suivez puissance, classe et race pendant que la partie avance."}, "battle": {"eyebrow": "AU COMBAT", "headline": "Affrontez le monstre ensemble", "sub": "Appelez des alliés, empilez les bonus et réglez le combat en groupe."}, "log": {"eyebrow": "HISTORIQUE", "headline": "Revivez chaque rebondissement", "sub": "Retrouvez les combats et les changements à table après les cartes."}},
    "lt": {"rooms-home": {"eyebrow": "SUBURKITE STALĄ", "headline": "Vienas kambarys visai komandai", "sub": "Sukurkite bendrą stalą ir sinchronizuokitės nuo pirmo ėjimo."}, "room-view": {"eyebrow": "STALAS GYVAI", "headline": "Stebėkite, kaip visi kyla", "sub": "Sekite galią, klasę ir rasę žaidimui tęsiantis."}, "battle": {"eyebrow": "Į MŪŠĮ", "headline": "Kovokite su monstru kartu", "sub": "Pasikvieskite sąjungininkus, dėkite premijas ir užbaikite kovą drauge."}, "log": {"eyebrow": "ŽAIDIMO ISTORIJA", "headline": "Peržiūrėkite kiekvieną posūkį", "sub": "Prisiminkite kovas ir stalo pokyčius, kai kortos jau išdalytos."}},
    "lv": {"rooms-home": {"eyebrow": "SAPULCĒ GALDU", "headline": "Viena istaba visai komandai", "sub": "Izveido kopīgu galdu un palieciet sinhronizēti jau no pirmā gājiena."}, "room-view": {"eyebrow": "GALDS TIEŠRAIDĒ", "headline": "Skaties, kā visi aug", "sub": "Seko spēkam, klasei un rasei, kamēr spēle turpinās."}, "battle": {"eyebrow": "KAUJĀ", "headline": "Stājieties pret briesmoni kopā", "sub": "Piesaisti sabiedrotos, krāj bonusus un izšķiriet cīņu kopā."}, "log": {"eyebrow": "SPĒLES VĒSTURE", "headline": "Atspēlē katru pavērsienu", "sub": "Pārskati cīņas un galda izmaiņas pēc kāršu izspēles."}},
    "et": {"rooms-home": {"eyebrow": "KOGUGE LAUD KOKKU", "headline": "Üks tuba kogu seltskonnale", "sub": "Looge ühine laud ja püsige esimesest käigust alates sünkroonis."}, "room-view": {"eyebrow": "LAUD OTSE-EETRIS", "headline": "Vaata, kuidas kõik arenevad", "sub": "Jälgi jõudu, klassi ja rassi, kuni mäng liigub edasi."}, "battle": {"eyebrow": "LAHINGUSSE", "headline": "Võtke koletis koos ette", "sub": "Kutsu liitlasi, lisa boonuseid ja lahendage võitlus koos."}, "log": {"eyebrow": "MÄNGU AJALUGU", "headline": "Ela iga pööre uuesti läbi", "sub": "Vaata lahinguid ja laua muudatusi ka pärast kaartide lauale jõudmist."}},
    "ru": {"rooms-home": {"eyebrow": "СОБЕРИТЕ СТОЛ", "headline": "Одна комната для всей компании", "sub": "Создайте общий стол и оставайтесь синхронны с первого хода."}, "room-view": {"eyebrow": "СТОЛ В ПРЯМОМ ЭФИРЕ", "headline": "Следите, как растут все", "sub": "Отслеживайте силу, класс и расу, пока игра продолжается."}, "battle": {"eyebrow": "В БОЙ", "headline": "Сразитесь с монстром вместе", "sub": "Зовите союзников, складывайте бонусы и решайте исход боя вместе."}, "log": {"eyebrow": "ИСТОРИЯ ИГРЫ", "headline": "Вспомните каждый поворот", "sub": "Просматривайте бои и изменения за столом после раздачи карт."}},
    "be": {"rooms-home": {"eyebrow": "ЗБЯРЫЦЕ СТОЛ", "headline": "Адзін пакой для ўсёй кампаніі", "sub": "Стварыце агульны стол і заставайцеся сінхроннымі з першага ходу."}, "room-view": {"eyebrow": "СТОЛ УЖЫВУЮ", "headline": "Сачыце, як растуць усе", "sub": "Сачыце за сілай, класам і расай, пакуль гульня працягваецца."}, "battle": {"eyebrow": "Ў БІТВУ", "headline": "Змагайцеся з пачварай разам", "sub": "Клічце саюзнікаў, дадавайце бонусы і вырашайце зыход бітвы разам."}, "log": {"eyebrow": "ГІСТОРЫЯ ГУЛЬНІ", "headline": "Узгадайце кожны паварот", "sub": "Праглядайце бітвы і змены за сталом пасля раздачы карт."}},
    "uk": {"rooms-home": {"eyebrow": "ЗБЕРІТЬ СТІЛ", "headline": "Одна кімната для всієї компанії", "sub": "Створіть спільний стіл і залишайтеся синхронними з першого ходу."}, "room-view": {"eyebrow": "СТІЛ НАЖИВО", "headline": "Стежте, як зростають усі", "sub": "Відстежуйте силу, клас і расу, поки гра триває."}, "battle": {"eyebrow": "ДО БОЮ", "headline": "Бийтеся з монстром разом", "sub": "Кличте союзників, додавайте бонуси й вирішуйте бій разом."}, "log": {"eyebrow": "ІСТОРІЯ ГРИ", "headline": "Згадайте кожен поворот", "sub": "Переглядайте бої та зміни за столом після роздачі карт."}},
    "es": {"rooms-home": {"eyebrow": "REÚNE LA MESA", "headline": "Una sala para toda la partida", "sub": "Crea una mesa compartida y mantened la sincronía desde el primer turno."}, "room-view": {"eyebrow": "MESA EN DIRECTO", "headline": "Mira cómo sube de nivel todo el grupo", "sub": "Sigue poder, clase y raza mientras la partida avanza."}, "battle": {"eyebrow": "AL COMBATE", "headline": "Enfrentad al monstruo juntos", "sub": "Llama a aliados, suma bonificaciones y resolved el combate en grupo."}, "log": {"eyebrow": "HISTORIAL", "headline": "Revive cada giro", "sub": "Revisa combates y cambios de la mesa después de jugar las cartas."}},
}


def resolve_font_path() -> Path:
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
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


def load_store_locale_config() -> Tuple[List[str], List[str]]:
    try:
        raw = json.loads(STORE_LOCALES_PATH.read_text(encoding="utf-8"))
        locales = raw["locales"]
        asset_directories = raw["listingAssetDirectories"]
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Invalid store screenshot locale config: {STORE_LOCALES_PATH.relative_to(ROOT)}") from error

    if not all(isinstance(locale, str) and locale for locale in locales):
        raise RuntimeError("Store screenshot locale config must contain non-empty locale strings")
    if not all(isinstance(directory, str) and directory for directory in asset_directories):
        raise RuntimeError("Store screenshot locale config must contain non-empty listing asset directories")
    return locales, asset_directories


def validate_locale_data(locales: Iterable[str], font_path: Path) -> None:
    configured_locales = list(locales)
    if set(configured_locales) != set(CAPTIONS):
        missing = sorted(set(configured_locales) - set(CAPTIONS))
        unexpected = sorted(set(CAPTIONS) - set(configured_locales))
        details = []
        if missing:
            details.append(f"missing captions: {', '.join(missing)}")
        if unexpected:
            details.append(f"unexpected captions: {', '.join(unexpected)}")
        raise RuntimeError(f"Store screenshot caption locales do not match config ({'; '.join(details)})")

    font = ImageFont.truetype(str(font_path), 40)
    required_slide_keys = set(SLIDES)
    for locale in configured_locales:
        for directory in load_store_locale_config()[1]:
            asset = STORE_ASSETS_DIR / directory / f"{locale}.txt"
            if not asset.is_file():
                raise RuntimeError(f"Missing App Store listing asset for {locale}: {asset.relative_to(ROOT)}")
        if set(CAPTIONS[locale]) != required_slide_keys:
            raise RuntimeError(f"Caption slides for {locale} must be: {', '.join(SLIDES)}")
        for slide_key, copy in CAPTIONS[locale].items():
            for field in ("eyebrow", "headline", "sub"):
                value = copy.get(field, "")
                if not isinstance(value, str) or not value.strip():
                    raise RuntimeError(f"Missing {field} caption text for {locale}/{slide_key}")
                # Arial Unicode and DejaVu Sans have distinct glyph masks for
                # supported characters. Comparing with U+FFFD catches a font
                # fallback before it produces replacement boxes in a store image.
                replacement_mask = bytes(font.getmask("�"))
                for character in value:
                    if not character.isspace() and bytes(font.getmask(character)) == replacement_mask:
                        raise RuntimeError(f"Font {font_path} does not support {character!r} in {locale}/{slide_key}")


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
            raise RuntimeError(f"Bezel screen rectangle ({screen.x}, {screen.y}, {screen.width}, {screen.height}) for {base_key!r} exceeds {asset_path.relative_to(ROOT)}")

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

    return scaled


def clip_screen_to_bezel_opening(screen_content: Image.Image, radius: int) -> Image.Image:
    radius = max(0, min(radius, screen_content.width // 2, screen_content.height // 2))
    if radius == 0:
        return screen_content
    mask = Image.new("L", screen_content.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        (0, 0, screen_content.width, screen_content.height),
        radius=radius,
        fill=255,
    )

    clipped = screen_content.copy()
    clipped.putalpha(ImageChops.multiply(clipped.getchannel("A"), mask))
    return clipped


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
    screen_radius = int(
        round(
            max(
                0,
                bezel_config.outer_radius - min(bezel_config.screen.x, bezel_config.screen.y),
            )
            * scale
        )
    )
    screen_content = clip_screen_to_bezel_opening(screen_content, screen_radius)
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


def fit_caption_fonts(
    draw: ImageDraw.ImageDraw, base: BaseCanvas, slide: Dict[str, object], font_path: Path, band_h: int
) -> Tuple[ImageFont.FreeTypeFont, ImageFont.FreeTypeFont, ImageFont.FreeTypeFont, List[str], List[str]]:
    max_width = base.width - (base.margin_x * 2)
    headline = str(slide["headline"])
    sub = str(slide["sub"])
    for scale_percent in range(100, 64, -5):
        eyebrow_font = ImageFont.truetype(str(font_path), max(1, base.eyebrow_size * scale_percent // 100))
        headline_font = ImageFont.truetype(str(font_path), max(1, base.headline_size * scale_percent // 100))
        sub_font = ImageFont.truetype(str(font_path), max(1, base.sub_size * scale_percent // 100))
        headline_lines = wrap_text(draw, headline, max_width, headline_font)
        sub_lines = wrap_text(draw, sub, max_width, sub_font)
        text_h = (
            eyebrow_font.size + 28 + len(headline_lines) * int(base.headline_leading * scale_percent / 100)
            + 18 + len(sub_lines) * int(base.sub_leading * scale_percent / 100)
        )
        if len(headline_lines) <= 2 and len(sub_lines) <= 2 and text_h <= band_h - 76:
            return eyebrow_font, headline_font, sub_font, headline_lines, sub_lines
    raise RuntimeError(f"Caption does not fit the {base.width}x{base.height} band: {headline!r}")


def draw_caption(
    draw: ImageDraw.ImageDraw,
    base: BaseCanvas,
    slide: Dict[str, object],
    font_path: Path,
    band_h: int,
) -> None:
    eyebrow_font, headline_font, sub_font, headline_lines, sub_lines = fit_caption_fonts(draw, base, slide, font_path, band_h)
    accent = THEME[str(slide["accent"])]
    x = base.margin_x
    scale_percent = headline_font.size / base.headline_size

    text_h = (
        eyebrow_font.size
        + 28
        + (len(headline_lines) * int(base.headline_leading * scale_percent))
        + 18
        + (len(sub_lines) * int(base.sub_leading * scale_percent))
    )
    y = max(38, (band_h - text_h) // 2)

    draw.text((x, y), str(slide["eyebrow"]), font=eyebrow_font, fill=accent)
    y += eyebrow_font.size + 28

    for line in headline_lines:
        draw.text((x - 2, y), line, font=headline_font, fill=THEME["textPrimary"])
        y += int(base.headline_leading * scale_percent)

    y += 12
    for line in sub_lines:
        draw.text((x, y), line, font=sub_font, fill=THEME["textMuted"])
        y += int(base.sub_leading * scale_percent)


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

    canvas = Image.new("RGBA", (base.width, base.height), THEME["background"])
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

    canvas.alpha_composite(device, (device_x, device_y))
    draw_caption(ImageDraw.Draw(canvas), base, slide, font_path, band_h)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output_path)


def compose_locale(locale: str, font_path: Path, bezel_configs: Dict[str, BezelConfig], target: str | None = None) -> None:
    if locale not in CAPTIONS:
        raise RuntimeError(f"Unsupported locale {locale!r}; available: {', '.join(sorted(CAPTIONS))}")

    selected_bases = BASES.items() if target is None else [(target, BASES[target])]
    for base_key, base in selected_bases:
        source_dir = ROOT / "screenshots" / base_key
        if not source_dir.is_dir():
            raise RuntimeError(f"Missing source screenshot directory: {source_dir.relative_to(ROOT)}")
        output_dir = ROOT / "screenshots" / f"{base_key}_store_preview" / locale
        for slide_key, shared_slide in SLIDES.items():
            slide = {**shared_slide, **CAPTIONS[locale][slide_key]}
            source_path = source_dir / str(slide["src"])
            output_path = output_dir / str(slide["dst"])
            if not source_path.is_file():
                raise RuntimeError(f"Missing source screenshot: {source_path.relative_to(ROOT)}")
            compose_slide(source_path, output_path, base_key, base, slide, font_path, bezel_configs)
            with Image.open(output_path) as image:
                if image.size != (base.width, base.height):
                    raise RuntimeError(f"Unexpected output size for {output_path.relative_to(ROOT)}: {image.size}")
                print(f"{output_path.relative_to(ROOT)} {image.size[0]}x{image.size[1]}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locale", default=LOCALE, help="one configured store locale")
    parser.add_argument("--all", action="store_true", help="render every configured store locale")
    parser.add_argument("--target", choices=sorted(BASES), help="render only one store target")
    parser.add_argument("--validate", action="store_true", help="validate locale assets, captions, fonts, and bezel config")
    args = parser.parse_args()

    locales, _ = load_store_locale_config()
    font_path = resolve_font_path()
    validate_locale_data(locales, font_path)
    bezel_configs = load_bezel_configs()
    print(f"FONT {font_path}")

    if args.validate:
        print(f"Validated store screenshot locales: {', '.join(locales)}")
        return

    requested_locales = locales if args.all else [args.locale]
    for locale in requested_locales:
        if locale not in locales:
            raise RuntimeError(f"Unsupported store locale {locale!r}; available: {', '.join(locales)}")
        compose_locale(locale, font_path, bezel_configs, args.target)


if __name__ == "__main__":
    main()
