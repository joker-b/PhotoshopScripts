#!/usr/bin/env python3
"""
Label Pix – Python version of AllMine.jsx-style metadata labeling.

Requirements:
  - exiftool (command-line) installed and on PATH
  - Pillow (`pip install pillow`)

Usage examples:
  python label_pix.py image.dng
  python label_pix.py -v image.jpg
  python label_pix.py -t image.dng
  python label_pix.py -c labeled.dng image.dng
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

try:
    from PIL import Image
except ImportError:
    Image = None  # we'll degrade gracefully if missing


# ---------------------------------------------------------------------------
# CONFIG / STATIC DATA  (ported/condensed from AllMine.jsx)
# ---------------------------------------------------------------------------

Person = {
    "fullname": "Kevin Bjorke",
    "altNames": ["K.Bjorke botzilla.com", "K. Bjorke", "K BJORKE", "KEVIN BJORKE"],
    "url": "http://www.kevin-bjorke.com/",
    "blog": "http://kevinbjorke.com",
    "relation": "Owner",
    "city": "San Francisco",
    "region": "California",
    "country": "USA",
    "commonTags": ["Bjorke", "Botzilla.com"],
    "reminder": "needs_tags",
}

Vendor = {
    "lumix": "Lumix",
    "fuji": "Fuji",
    "contax": "Contax",
    "canon": "Canon",
    "dji": "DJI",
    "leica": "Leica",
    "nikon": "Nikon",
    "minolta": "Minolta",
    "konica": "Konica",
    "bronica": "Bronica",
    "yashica": "Yashica",
    "google": "Google",
    "olympus": "Olympus",
    "samsung": "Samsung",
    "sigma": "Sigma",
    "ricoh": "Ricoh",
    "zeiss": "Zeiss",
}

# Camera catalog (shortened but faithful; extend as needed)
CameraCatalog: Dict[str, Dict[str, Any]] = {
    "DMC-LX1": {
        "keywords": ["LX1", "DMC_LX1", "Leica", "Lumix"],
        "brand": Vendor["lumix"],
        "multiplier": 4.4,
        "camera": "LX1",
    },
    "DMC-LX2": {
        "keywords": ["LX2", "DMC_LX2", "Leica", "Lumix"],
        "brand": Vendor["lumix"],
        "multiplier": 4.4,
        "camera": "LX2",
    },
    "DMC-LX3": {
        "keywords": ["LX3", "DMC_LX3", "Leica", "Lumix"],
        "brand": Vendor["lumix"],
        "multiplier": 4.67,
        "camera": "LX3",
    },
    "DMC-LX5": {
        "keywords": ["LX5", "DMC_LX5", "Leica", "Lumix"],
        "brand": Vendor["lumix"],
        "multiplier": 4.67,
        "camera": "LX5",
    },
    "DMC-LX7": {
        "keywords": ["LX7", "DMC_LX7", "Leica", "Lumix"],
        "brand": Vendor["lumix"],
        "multiplier": 4.67,
        "camera": "LX7",
    },
    "DC-S5M2": {
        "keywords": ["S5ii", "Lumix", "S5M2"],
        "brand": Vendor["lumix"],
        "multiplier": 1.0,
        "camera": "S5ii",
    },
    "X100S": {
        "keywords": ["Fuji X100s", "X100s"],
        "brand": Vendor["fuji"],
        "multiplier": 35.0 / 23.0,
        "camera": "X100s",
    },
    "X100T": {
        "keywords": ["Fuji X100T", "X100T"],
        "brand": Vendor["fuji"],
        "multiplier": 35.0 / 23.0,
        "camera": "X100T",
    },
    "X100F": {
        "keywords": ["Fuji X100F", "X100F"],
        "brand": Vendor["fuji"],
        "multiplier": 35.0 / 23.0,
        "camera": "X100F",
    },
    "X-T1": {
        "keywords": ["Fuji X-T1", "X-T1"],
        "brand": Vendor["fuji"],
        "multiplier": 35.0 / 23.0,
        "camera": "X-T1",
    },
    "X-Pro2": {
        "keywords": ["Fuji X-Pro2", "X-Pro2"],
        "brand": Vendor["fuji"],
        "multiplier": 35.0 / 23.0,
        "camera": "X-Pro2",
    },
    "X-E3": {
        "keywords": ["Fuji X-E3", "X-E3"],
        "brand": Vendor["fuji"],
        "multiplier": 35.0 / 23.0,
        "camera": "X-E3",
    },
    "M Monochrom": {
        "keywords": [Vendor["leica"], "M Monochrom", "Monochrom", "Leica Mono", "Mono", "Black and White", "MM"],
        "brand": Vendor["leica"],
        "multiplier": 1.0,
        "camera": "M Monochrom",
    },
    "LEICA M MONOCHROM (Typ 246)": {
        "keywords": [Vendor["leica"], "Monochrom 246", "Monochrom", "M246", "Mono", "Black and White"],
        "brand": Vendor["leica"],
        "multiplier": 1.0,
        "camera": "Leica M246",
    },
    "LEICA M10-R": {
        "keywords": [Vendor["leica"], "M", "M10", "M10-R"],
        "brand": Vendor["leica"],
        "multiplier": 1.0,
        "camera": "Leica M10-R",
    },
    "LEICA SL2": {
        "keywords": [Vendor["leica"], "SL", "SL2"],
        "brand": Vendor["leica"],
        "multiplier": 1.0,
        "camera": "Leica SL2",
    },
    "Canon EOS 5D": {
        "keywords": ["5D", "EOS", "Canon 5D"],
        "brand": Vendor["canon"],
        "multiplier": 1.0,
        "camera": "5D",
    },
    "Canon EOS 40D": {
        "keywords": ["40D", "EOS", "Canon 40D"],
        "brand": Vendor["canon"],
        "multiplier": 1.6,
        "camera": "40D",
    },
    "Canon EOS DIGITAL REBEL": {
        "keywords": ["300D", "EOS"],
        "brand": Vendor["canon"],
        "multiplier": 1.6,
        "camera": "300D",
    },
    "DJI Air 3S": {
        "keywords": ["Air 3S", "DJI", "Drone", "Quadcopter", "Aerial"],
        "brand": Vendor["dji"],
        "camera": "Air 3S",
    },
    "FC9184": {
        "keywords": ["Air 3S", "DJI", "Drone", "Quadcopter", "Aerial"],
        "brand": Vendor["dji"],
        "camera": "Air 3S",
    },
    "Canon VIXIA HF S11": {
        "keywords": ["Camcorder", "VIXIA"],
        "brand": Vendor["canon"],
        "multiplier": 435.0 / 64.0,
        "camera": "HFS11",
    },
    "RICOH THETA S": {
        "keywords": ["Ricoh", "Theta S", "Theta", "Panorama", "Spherical"],
        "brand": Vendor["ricoh"],
        "camera": "Ricoh Theta S",
    },
    "SM-SM-S918U1": {
        "keywords": ["Samsung", "Phone", "S23 Ultra"],
        "brand": Vendor["samsung"],
        "camera": "Samsung S23 Ultra",
    },
    "Galaxy S23 Ultra": {
        "keywords": ["Samsung", "Galaxy", "Phone", "S23 Ultra"],
        "brand": Vendor["samsung"],
        "camera": "Samsung S23 Ultra",
    },
    "SM-G920T": {
        "keywords": ["Samsung", "Phone", "Galaxy 6"],
        "brand": Vendor["samsung"],
        "camera": "Samsung Galaxy 6",
    },
    "Pixel 3": {
        "keywords": ["Google", "Phone", "Pixel"],
        "brand": Vendor["google"],
        "camera": "Google Pixel 3",
    },
    "Glass1": {
        "keywords": ["Google", "Glass", "Google Glass", "Android"],
        "brand": Vendor["google"],
        "multiplier": 8.0,
        "camera": "Google Glass",
    },
    "Contax G2": {
        "keywords": ["Contax", "G2", Vendor["zeiss"], "Film"],
        "brand": Vendor["contax"],
        "multiplier": 1.0,
        "camera": "G2",
        "film": True,
    },
    "Nikon F2": {
        "keywords": ["Nikon", "F2", "Film"],
        "brand": Vendor["nikon"],
        "multiplier": 1.0,
        "camera": "F2",
        "film": True,
    },
    "Leica CL": {
        "keywords": ["Leica", "Leica CL", "Leitz Minolta", "Leitz", "Minolta", "M", "Film"],
        "brand": Vendor["leica"],
        "multiplier": 1.0,
        "camera": "Leica CL",
        "film": True,
    },
    "Leica M5": {
        "keywords": ["Leica", "Leica M5", "Leitz", "Leica M", "Film"],
        "brand": Vendor["leica"],
        "multiplier": 1.0,
        "camera": "Leica M5",
        "film": True,
    },
    "Leica M4-P": {
        "keywords": ["Leica", "Leica M4-P", "Leitz", "Leica M", "Film"],
        "brand": Vendor["leica"],
        "multiplier": 1.0,
        "camera": "Leica M4-P",
        "film": True,
    },
    "Konica II": {
        "keywords": ["Konica", "Konica II", "Film"],
        "brand": Vendor["konica"],
        "multiplier": 1.0,
        "camera": "Konica II",
        "film": True,
    },
    "Canon AE-1": {
        "keywords": ["Canon", "AE-1", "Film"],
        "brand": Vendor["canon"],
        "multiplier": 1.0,
        "camera": "AE-1",
        "film": True,
    },
    "Bronica RF645": {
        "keywords": ["Bronica", "RF645", "RF", "Film"],
        "brand": Vendor["bronica"],
        "multiplier": 50.0 / 65.0,
        "camera": "RF645",
        "film": True,
    },
    "Yashicamat 124G": {
        "keywords": ["Yashica", "Yashicamt", "124", "124G", "Film"],
        "brand": Vendor["yashica"],
        "multiplier": 50.0 / 80.0,
        "camera": "124G",
        "film": True,
    },
    "EZ Controller": {
        "keywords": ["Scanner", "Film"],
        "brand": "Noritsu",
        "camera": "Noritsu",
        "film": True,
    },
    "MJ": {
        "keywords": ["Generative", "Midjourney"],
        "brand": "Midjourney",
        "camera": "Midjourney",
        "film": True,
    },
}

# A minimal lens catalog: feel free to extend with the full list
LensCatalog: Dict[str, Dict[str, Any]] = {
    # Fuji
    "XF35mmF1.4 R": {
        "keywords": [],
        "minAperture": "f/1.4",
        "primeLength": 35,
    },
    "XF23mmF1.4 R": {
        "keywords": [],
        "minAperture": "f/1.4",
        "primeLength": 23,
    },
    "XF23mmF2 R WR": {
        "keywords": [],
        "minAperture": "f/2.0",
        "primeLength": 23,
    },
    "XF18-55mmF2.8-4 R LM OIS": {
        "keywords": ["kit lens", "zoom"],
        "minAperture": "f/2.8-4",
    },
    # X100 fixed lens
    "Fujinon 23/2": {
        "keywords": ["X100"],
        "minAperture": "f/2.0",
        "primeLength": 23,
    },
    # L-mount example
    "LUMIX S 50/F1.8": {
        "keywords": [Vendor["lumix"], "Normal"],
        "minAperture": "f/1.8",
        "primeLength": 50,
        "family": "Lumix",
        "mount": "L",
    },
    # Generic placeholders
    "UNKNOWN": {
        "keywords": ["unknown"],
        "minAperture": "f/?",
    },
}

AdaptedFocalLengths: Dict[int, str] = {
    21: "Zeiss Biogon T* 2,8/21 ZM",
    24: "Nikkor-N 24mm f/2.8",
    28: "M-Rokkor 1:2.8/28",
    35: "Zeiss Distagon T* 1,4/35 ZM",
    40: "M-Rokkor 1:2/40",
    45: "Contax Planar 2/45",
    50: "Nikkor 50mm f/1.4 AI",
    55: "Micro-Nikkor 55mm f/3.5",
    85: "Zeiss Milvus 1.4/85 ZE",
    90: "Contax Sonnar 2.8/90",
    300: "Nikkor-ED 300mm f/4.5",
}

# Lens families for keyword enrichment
LensFamilyNames: Dict[str, Dict[str, Any]] = {
    "Voigtlander": {"keywords": ["Cosina"]},
    "Nikkor": {"keywords": [Vendor["nikon"]]},
    "Fujinon": {"keywords": [Vendor["fuji"]]},
    "Summicron": {"keywords": [Vendor["leica"]]},
    "Summilux": {"keywords": [Vendor["leica"]]},
    "Elmar": {"keywords": [Vendor["leica"]]},
    "Elmarit": {"keywords": [Vendor["leica"]]},
    "Tele-Elmarit": {"keywords": [Vendor["leica"]]},
    "Rokkor": {"keywords": [Vendor["minolta"]]},
    "M-Rokkor": {"keywords": [Vendor["leica"], Vendor["minolta"]]},
    "Ultron": {"keywords": ["Voigtlander"]},
    "Nokton": {"keywords": ["Voigtlander"]},
}


# ---------------------------------------------------------------------------
# Helper data structures and functions
# ---------------------------------------------------------------------------

@dataclass
class LensInfo:
    keywords: List[str] = field(default_factory=list)
    name: str = "UNKNOWN"
    minAperture: str = "f/?"
    family: str = ""
    brand: str = ""
    primeLength: float = 0.0
    equivFL: float = 0.0
    description: str = ""
    mount: Optional[str] = None
    found: bool = False


@dataclass
class DescBits:
    camera: str = "Scanned"
    isFilm: bool = False
    multiplier: float = 1.0
    lens: LensInfo = field(default_factory=LensInfo)
    brand: str = "Bjorke"
    shutter: Optional[str] = None
    aperture: Optional[str] = None
    iso: Optional[str] = None
    flash: Optional[str] = None
    PixX: Optional[int] = None
    PixY: Optional[int] = None
    ImgW: Optional[int] = None
    ImgH: Optional[int] = None
    alertText: str = ""

    def alert(self, text: str):
        self.alertText += text + "\n"


def vprint(verbose: bool, *args, **kwargs):
    if verbose:
        print(*args, **kwargs)


def merge_keywords(existing: List[str], new_items: List[str]) -> List[str]:
    """Set-like merge, sorted, ignoring empties."""
    s = {k for k in existing if k}
    for item in new_items:
        if item:
            s.add(item)
    return sorted(s)


def no_extension(name: str) -> str:
    if not name:
        return ""
    base, _ = os.path.splitext(name)
    return base


def job_name(name: str) -> str:
    """Rough equivalent of jobName() in JS."""
    if not name:
        return "empty_jobname"
    base = name
    # strip back: _ABCD1234 etc and tail
    import re
    base = re.sub(r"(_[A-Z0-9]{4}\d{4}.*)", "", base)
    if base == "":
        return "no_jobname"
    # strip front chunk if there is one
    base = re.sub(r"[a-zA-Z0-9]*_", "", base)
    return base


def check_exiftool():
    import shutil
    if shutil.which("exiftool") is None:
        print("Error: exiftool not found on PATH. Please install exiftool.", file=sys.stderr)
        sys.exit(1)


def run_exiftool_json(path: str) -> Dict[str, Any]:
    cmd = ["exiftool", "-j", "-n", path]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"exiftool failed: {proc.stderr.strip()}")
    data = json.loads(proc.stdout)
    if not data:
        raise RuntimeError("exiftool returned no data")
    return data[0]


# ---------------------------------------------------------------------------
# Core metadata logic (simplified port)
# ---------------------------------------------------------------------------

def is_grayscale(path: str, verbose: bool) -> bool:
    if Image is None:
        vprint(verbose, "Pillow not installed; skipping grayscale detection.")
        return False
    try:
        with Image.open(path) as im:
            vprint(verbose, f"PIL mode: {im.mode}")
            return im.mode in ("1", "L", "LA", "I;16")
    except Exception as e:
        vprint(verbose, f"Could not open image with PIL for grayscale detection: {e}")
        return False


def classify_aspect_and_resolution(meta: Dict[str, Any], desc: DescBits, keywords: List[str], verbose: bool):
    # Try EXIF sizes first
    w = meta.get("ImageWidth") or meta.get("ExifImageWidth")
    h = meta.get("ImageHeight") or meta.get("ExifImageHeight")

    # Fall back to PIL if needed
    if (w is None or h is None) and Image is not None:
        try:
            with Image.open(meta["SourceFile"]) as im:
                w, h = im.size
        except Exception:
            pass

    if w is None or h is None:
        vprint(verbose, "No dimensions available for aspect/hires checks.")
        return

    desc.ImgW = w
    desc.ImgH = h

    # Aspect ratio tags
    long_side = max(w, h)
    short_side = min(w, h)
    if short_side <= 0:
        return
    aspect = long_side / short_side
    wide = w > h

    def add_kw(k: str):
        keywords.append(k)

    if aspect > 2.36:
        add_kw("Panorama")
        if not wide:
            add_kw("Tall")
    elif aspect > 2.3:
        add_kw("2.35:1" if wide else "1:2.35")
    elif aspect > 1.97:
        add_kw("2:1" if wide else "1:2")
    elif aspect > 1.68:
        add_kw("16:9" if wide else "9:16")
    elif aspect > 1.45:
        add_kw("3:2" if wide else "2:3")
    elif aspect > 1.25:
        add_kw("4:3" if wide else "3:4")
    else:
        add_kw("Square")
        add_kw("1:1")

    # hi-res tag
    if w * h > (9000 * 6000):
        add_kw("hires")
        add_kw("hi-res")

    # Attempt to detect resize by comparing ImageWidth/Height vs ExifImageWidth/Height
    exif_w = meta.get("ExifImageWidth")
    exif_h = meta.get("ExifImageHeight")
    if exif_w and exif_h and (exif_w != w or exif_h != h):
        add_kw("resized")
        desc.alert(f"Resized from {exif_w}, {exif_h}")


def enrich_camera_info(model: Optional[str], desc: DescBits, keywords: List[str], verbose: bool):
    if not model:
        return
    model = model.strip()
    camera = CameraCatalog.get(model)
    if camera:
        keywords.extend(camera.get("keywords", []))
        desc.camera = camera.get("camera", model)
        desc.brand = camera.get("brand", desc.brand)
        desc.multiplier = camera.get("multiplier", desc.multiplier)
        desc.isFilm = camera.get("film", False)
        vprint(verbose, f"Recognized camera model {model}: {desc.camera}")
    else:
        desc.camera = f"Camera: {model}"
        desc.alert(f"Unknown Camera: \"{model}\"")
        vprint(verbose, f"Unknown camera model {model}")


def find_lens_by_name(lens_name: str, verbose: bool) -> LensInfo:
    lens_name = lens_name.strip()
    base = LensCatalog.get(lens_name)
    if base:
        li = LensInfo(
            keywords=list(base.get("keywords", [])),
            name=lens_name,
            minAperture=base.get("minAperture", "f/?"),
            family=base.get("family", ""),
            mount=base.get("mount"),
            primeLength=float(base.get("primeLength", 0.0)),
        )
        if not li.description:
            li.description = lens_name
        li.found = True
        vprint(verbose, f"Found lens in catalog: {lens_name}")
        return li

    # Simple guess: "35mm" style
    import re
    m = re.search(r"([0-9.]+)\s*mm", lens_name)
    if m:
        fl = float(m.group(1))
        li = LensInfo(
            keywords=[f"Probably {m.group(0)}", lens_name],
            name=lens_name,
            primeLength=fl,
            minAperture="f/??",
            description=lens_name,
            found=True,
        )
        vprint(verbose, f"Guessed lens from name: {lens_name}")
        return li

    # unknown lens
    vprint(verbose, f"Lens name not recognized: {lens_name}")
    return LensInfo(name=lens_name)


def guess_adapted_lens(focal_length: float, verbose: bool) -> Optional[LensInfo]:
    name = AdaptedFocalLengths.get(int(round(focal_length)))
    if not name:
        vprint(verbose, f"No adapted lens mapping for {focal_length}mm")
        return None
    vprint(verbose, f"Adapted lens for {focal_length}mm: {name}")
    return find_lens_by_name(name, verbose)


def classify_focal_length(desc: DescBits, keywords: List[str], verbose: bool):
    fl_equiv = desc.lens.equivFL
    if fl_equiv <= 0 and desc.lens.primeLength > 0 and desc.multiplier > 0:
        fl_equiv = round(desc.lens.primeLength * desc.multiplier)
        desc.lens.equivFL = fl_equiv

    if fl_equiv <= 0:
        return

    vprint(verbose, f"Equivalent focal length: {fl_equiv}mm")

    if fl_equiv <= 35:
        keywords.append("Wide Angle")
        if fl_equiv < 25:
            keywords.append("Ultra Wide Angle")
    elif fl_equiv >= 135:
        keywords.append("Tele")
    elif fl_equiv >= 85:
        keywords.append("Portrait")

    if desc.lens.primeLength and fl_equiv != desc.lens.primeLength:
        keywords.append(f"{int(fl_equiv)}mm_equiv")


def apply_personal_information(meta: Dict[str, Any], updates: Dict[str, Any], verbose: bool):
    """Set author/credit/city/state/country if empty."""
    def if_empty(tag_name: str, value: str):
        if not meta.get(tag_name):
            updates[tag_name] = value
            vprint(verbose, f"Setting {tag_name} -> {value}")

    if_empty("Artist", Person["fullname"])
    if_empty("Creator", Person["fullname"])
    if_empty("By-line", Person["fullname"])
    if_empty("By-lineTitle", Person["relation"])
    if_empty("Credit", Person["fullname"])

    if_empty("City", Person["city"])
    if_empty("State", Person["region"])
    if_empty("Country", Person["country"])


def assign_copyright(meta: Dict[str, Any], updates: Dict[str, Any], verbose: bool):
    from datetime import datetime

    this_year = datetime.now().year
    target = f"(C) {this_year} {Person['fullname']}"

    existing = meta.get("CopyrightNotice") or meta.get("Copyright")
    if not existing or len(str(existing).strip()) <= 2:
        updates["CopyrightNotice"] = target
        updates["Copyright"] = target
        vprint(verbose, f"Assigned CopyrightNotice -> {target}")
    else:
        vprint(verbose, f"Existing CopyrightNotice kept: {existing}")


def apply_caption(meta: Dict[str, Any], desc: DescBits, base_name: str, updates: Dict[str, Any], verbose: bool):
    title = meta.get("Title") or ""
    headline = meta.get("Headline") or ""
    description = meta.get("Description") or meta.get("Caption-Abstract") or ""

    # Title from file, stripping bjorke_ prefix
    if not title:
        t = no_extension(base_name)
        if t.startswith("bjorke_"):
            t = t[len("bjorke_"):]
        title = t
        updates["Title"] = title
        vprint(verbose, f"Setting Title -> {title}")

    if not headline:
        headline = title
        updates["Headline"] = headline
        vprint(verbose, f"Setting Headline -> {headline}")

    if not description:
        # Similar to JS: blog * camera + lens description...
        desc_parts = [f"{Person['blog']} * {desc.camera}"]
        if desc.lens.description:
            desc_parts.append(f"+ {desc.lens.description}")
        if desc.lens.minAperture:
            desc_parts.append(f"{desc.lens.minAperture}")
        caption_line1 = " ".join(desc_parts)
        caption = caption_line1 + "\n" + no_extension(base_name)
        updates["Description"] = caption
        updates["Caption-Abstract"] = caption
        updates["Writer-Editor"] = Person["fullname"]
        vprint(verbose, f"Setting Description/Caption -> {caption!r}")


# ---------------------------------------------------------------------------
# Orchestration for one file
# ---------------------------------------------------------------------------

def process_image(path: str, text_only: bool, verbose: bool) -> None:
    check_exiftool()
    meta = run_exiftool_json(path)
    meta["SourceFile"] = path  # for PIL fallback

    # Start from existing keywords
    raw_keywords = meta.get("Keywords", [])
    if isinstance(raw_keywords, str):
        existing_keywords = [raw_keywords]
    elif isinstance(raw_keywords, list):
        existing_keywords = list(raw_keywords)
    else:
        existing_keywords = []

    initial_keyword_count = len(existing_keywords)

    desc = DescBits()
    new_keywords: List[str] = []

    # Grayscale = add BW tags
    if is_grayscale(path, verbose):
        new_keywords.extend(["BW", "Black and White", "Black & White", "B&W", "Monochrome"])

    # Add personal common tags & name
    new_keywords.extend(Person["commonTags"] + [Person["fullname"]])

    # Job name from filename
    base_name = os.path.basename(path)
    new_keywords.append(job_name(base_name))

    # Camera/model
    camera_model = meta.get("Model") or meta.get("CameraModelName")
    enrich_camera_info(camera_model, desc, new_keywords, verbose)

    # Lens info
    lens_name = meta.get("LensModel") or meta.get("LensID")
    if lens_name:
        desc.lens = find_lens_by_name(str(lens_name), verbose)
    focal_len = meta.get("FocalLength")
    if focal_len and not desc.lens.primeLength:
        try:
            desc.lens.primeLength = float(focal_len)
        except Exception:
            pass
    # Equivalent FL if given
    fl35 = meta.get("FocalLengthIn35mmFormat")
    if fl35:
        try:
            desc.lens.equivFL = float(fl35)
        except Exception:
            pass

    # If we have FL but no lens name, try adapted mapping
    if not desc.lens.found and desc.lens.primeLength > 0:
        guessed = guess_adapted_lens(desc.lens.primeLength, verbose)
        if guessed:
            desc.lens = guessed

    # If still no description, use lens name or primeLength
    if not desc.lens.description:
        if desc.lens.name and desc.lens.name != "UNKNOWN":
            desc.lens.description = desc.lens.name
        elif desc.lens.primeLength > 0:
            desc.lens.description = f"{int(desc.lens.primeLength)}mm"

    # Add any lens keywords
    new_keywords.extend(desc.lens.keywords)

    # Lens mount keyword
    if desc.lens.mount:
        new_keywords.append(desc.lens.mount)

    # Year keyword from DateTimeOriginal/CreateDate
    dt = meta.get("DateTimeOriginal") or meta.get("CreateDate")
    if isinstance(dt, str) and len(dt) >= 4 and dt[:4].isdigit():
        new_keywords.append(dt[:4])

    # Classification of FL
    classify_focal_length(desc, new_keywords, verbose)

    # Aspect ratio + hi-res + resized
    classify_aspect_and_resolution(meta, desc, new_keywords, verbose)

    # If we had no prior keywords, add reminder
    if initial_keyword_count == 0:
        new_keywords.append(Person["reminder"])

    # Merge with existing keywords
    final_keywords = merge_keywords(existing_keywords, new_keywords)

    # Build tag updates
    updates: Dict[str, Any] = {}

    # Set Keywords
    if final_keywords != existing_keywords:
        updates["Keywords"] = final_keywords

    # Personal info & copyright & caption
    apply_personal_information(meta, updates, verbose)
    assign_copyright(meta, updates, verbose)
    apply_caption(meta, desc, base_name, updates, verbose)

    # Report / write
    if text_only:
        print(f"File: {path}")
        print("Would set Keywords:")
        for k in final_keywords:
            print("  -", k)
        if "Title" in updates:
            print("Title:", updates["Title"])
        if "Headline" in updates:
            print("Headline:", updates["Headline"])
        if "Description" in updates:
            print("Description:\n", updates["Description"])
        if desc.alertText:
            print("\nNotes/warnings:")
            print(desc.alertText.strip())
        return

    # Actually write metadata with exiftool
    if updates:
        write_with_exiftool(path, updates, verbose)
        if desc.alertText:
            print("Notes/warnings:")
            print(desc.alertText.strip())
    else:
        vprint(verbose, "No metadata changes needed.")


def write_with_exiftool(path: str, updates: Dict[str, Any], verbose: bool):
    """
    Use exiftool to write the updated metadata.

    Keywords are handled as a list; other fields as single values.
    """
    cmd = ["exiftool", "-overwrite_original"]

    # Keywords: clear and then add each
    if "Keywords" in updates:
        kws = updates.pop("Keywords")
        cmd.append("-Keywords=")  # clear
        for kw in kws:
            cmd.append(f"-Keywords+={kw}")

    # All other tags: simple assignment
    for tag, val in updates.items():
        # exiftool tags like Title, Headline, Description, City, etc.
        cmd.append(f"-{tag}={val}")

    cmd.append(path)

    vprint(verbose, "Running:", " ".join(cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        # If we can't write, remind about -c
        print(
            f"Error: failed to write metadata to {path}:\n{proc.stderr.strip()}\n"
            "If this format cannot be updated in-place, try using the -c option to work on a copy.",
            file=sys.stderr,
        )
        sys.exit(1)
    else:
        vprint(verbose, proc.stdout.strip())


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Add labels/keywords/captions to JPG/DNG files (AllMine.jsx-style)."
    )
    parser.add_argument("image", help="Path to a JPG or DNG file")
    parser.add_argument(
        "-t",
        "--text-only",
        action="store_true",
        help="Text mode: print new metadata instead of modifying the file.",
    )
    parser.add_argument(
        "-c",
        "--copy",
        metavar="NAME",
        help="Create a copy of the source image file with this name, then modify the copy.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Verbose output.",
    )

    args = parser.parse_args()

    src = args.image
    ext = os.path.splitext(src)[1].lower()

    if ext not in (".jpg", ".jpeg", ".dng"):
        print(
            f"Error: unsupported file type '{ext}'. This script only accepts JPG and DNG.\n"
            "If your workflow requires another format, try exporting to JPG or DNG first, "
            "or use the -c option with a supported copy.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Text-only mode: never modify the file, ignore -c
    if args.text_only:
        if args.copy and args.verbose:
            vprint(True, "Note: -c option is ignored in --text-only mode.")
        target_path = src
    else:
        # If copy requested, create it and operate on the copy
        if args.copy:
            if os.path.isabs(args.copy) or os.path.dirname(args.copy):
                copy_path = args.copy
            else:
                # Put copy next to original
                copy_path = os.path.join(os.path.dirname(src), args.copy)
            if copy_path == src:
                print("Error: copy name must be different from source.", file=sys.stderr)
                sys.exit(1)
            shutil.copy2(src, copy_path)
            vprint(args.verbose, f"Created copy: {copy_path}")
            target_path = copy_path
        else:
            target_path = src

    process_image(target_path, text_only=args.text_only, verbose=args.verbose)


if __name__ == "__main__":
    main()
