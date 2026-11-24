# tests/templates/build-fonts.py — the resume font pairs as app assets (owner P3 #3: bundled TTF assets, Latin subset,
# the chosen pair only at print time, Noto Naskh Arabic only for an Urdu-script name, OFL only).
# Downloads each family from Google's fonts repository (the ofl/ folder: SIL Open Font License), fixes variable fonts
# at the weights the templates use, keeps only the characters a resume needs (Latin; Arabic for Noto Naskh), and
# writes app/assets/resume-fonts/<file>.ttf plus each family's OFL.txt. Run again only to change the set:
#   py -3 tests/templates/build-fonts.py
# Needs Python with fonttools (a local tool; nothing is added to the project). DM Sans comes from the app's own
# @expo-google-fonts/dm-sans package (already bundled), so it isn't downloaded.
import io, os, sys, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "app", "assets", "resume-fonts")
BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"

LATIN = [*range(0x20, 0x7F), *range(0xA0, 0x100), 0x152, 0x153, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x20AC, 0x2122]
ARABIC = [0x20, *range(0x600, 0x700), *range(0x750, 0x780), *range(0xFB50, 0xFE00), *range(0xFE70, 0xFF00)]

# (output file, folder, source file, weight or None for a static file, characters)
FILES = [
    ("Inter-400.ttf", "inter", "Inter[opsz,wght].ttf", 400, LATIN),
    ("Inter-700.ttf", "inter", "Inter[opsz,wght].ttf", 700, LATIN),
    ("Lora-700.ttf", "lora", "Lora[wght].ttf", 700, LATIN),
    ("SourceSans3-400.ttf", "sourcesans3", "SourceSans3[wght].ttf", 400, LATIN),
    ("SourceSans3-700.ttf", "sourcesans3", "SourceSans3[wght].ttf", 700, LATIN),
    ("Merriweather-700.ttf", "merriweather", "Merriweather[opsz,wdth,wght].ttf", 700, LATIN),
    ("Lato-400.ttf", "lato", "Lato-Regular.ttf", None, LATIN),
    ("Lato-700.ttf", "lato", "Lato-Bold.ttf", None, LATIN),
    ("DMSerifDisplay-400.ttf", "dmserifdisplay", "DMSerifDisplay-Regular.ttf", None, LATIN),
    ("Poppins-600.ttf", "poppins", "Poppins-SemiBold.ttf", None, LATIN),
    ("OpenSans-400.ttf", "opensans", "OpenSans[wdth,wght].ttf", 400, LATIN),
    ("OpenSans-700.ttf", "opensans", "OpenSans[wdth,wght].ttf", 700, LATIN),
    ("IBMPlexSerif-700.ttf", "ibmplexserif", "IBMPlexSerif-Bold.ttf", None, LATIN),
    ("IBMPlexSans-400.ttf", "ibmplexsans", "IBMPlexSans[wdth,wght].ttf", 400, LATIN),
    ("IBMPlexSans-700.ttf", "ibmplexsans", "IBMPlexSans[wdth,wght].ttf", 700, LATIN),
    ("Bitter-700.ttf", "bitter", "Bitter[wght].ttf", 700, LATIN),
    ("Roboto-400.ttf", "roboto", "Roboto[wdth,wght].ttf", 400, LATIN),
    ("Roboto-700.ttf", "roboto", "Roboto[wdth,wght].ttf", 700, LATIN),
    ("NotoSans-400.ttf", "notosans", "NotoSans[wdth,wght].ttf", 400, LATIN),
    ("NotoSans-700.ttf", "notosans", "NotoSans[wdth,wght].ttf", 700, LATIN),
    ("NotoNaskhArabic-400.ttf", "notonaskharabic", "NotoNaskhArabic[wght].ttf", 400, ARABIC),
    ("NotoNaskhArabic-700.ttf", "notonaskharabic", "NotoNaskhArabic[wght].ttf", 700, ARABIC),
]

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

def main():
    os.makedirs(OUT, exist_ok=True)
    cache, total = {}, 0
    for out, folder, src, weight, chars in FILES:
        key = folder + "/" + src
        if key not in cache:
            cache[key] = fetch(BASE + folder + "/" + src.replace("[", "%5B").replace("]", "%5D"))
        font = TTFont(io.BytesIO(cache[key]))
        if "fvar" in font:
            axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
            if weight is not None:
                axes["wght"] = weight
            font = instancer.instantiateVariableFont(font, axes)
        opts = subset.Options()
        opts.layout_features = ["kern", "liga", "calt", "rlig", "init", "medi", "fina", "isol", "ccmp", "mark", "mkmk"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        sub = subset.Subsetter(options=opts)
        sub.populate(unicodes=chars)
        sub.subset(font)
        path = os.path.join(OUT, out)
        font.save(path)
        size = os.path.getsize(path)
        total += size
        print(f"{out:28s} {size // 1024:4d} KB")
        lic = os.path.join(OUT, f"OFL-{folder}.txt")
        if not os.path.exists(lic):
            with open(lic, "wb") as f:
                f.write(fetch(BASE + folder + "/OFL.txt"))
    print(f"total {total // 1024} KB in {len(FILES)} files")

if __name__ == "__main__":
    sys.exit(main())
