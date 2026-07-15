from pathlib import Path
import json, re, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

for html in ROOT.rglob("*.html"):
    if any(part in {"docs", "tests"} for part in html.parts):
        continue
    text = html.read_text(encoding="utf-8")
    ids = re.findall(r'\bid=["\']([^"\']+)', text)
    duplicates = sorted({x for x in ids if ids.count(x) > 1})
    if duplicates:
        errors.append(f"Duplicate id {html.relative_to(ROOT)}: {duplicates}")
    for attr in ("href", "src"):
        for value in re.findall(fr'\b{attr}=["\']([^"\']+)', text):
            if value.startswith(("http:", "https:", "mailto:", "#", "data:", "javascript:")):
                continue
            clean = value.split("?")[0].split("#")[0]
            if not clean:
                continue
            target = (html.parent / clean).resolve()
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                errors.append(f"Path keluar root: {html.relative_to(ROOT)} -> {value}")
                continue
            if not target.exists():
                errors.append(f"Missing link: {html.relative_to(ROOT)} -> {value}")

for js in ROOT.rglob("*.js"):
    if any(part in {"docs", "tests"} for part in js.parts):
        continue
    text = js.read_text(encoding="utf-8")
    for value in re.findall(r'from\s+["\']([^"\']+)["\']', text):
        if not value.startswith("."):
            continue
        target = (js.parent / value).resolve()
        if not target.exists():
            errors.append(f"Missing import: {js.relative_to(ROOT)} -> {value}")

for json_file in ROOT.rglob("*.json"):
    try:
        json.loads(json_file.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"JSON invalid {json_file.relative_to(ROOT)}: {exc}")

sw = (ROOT / "service-worker.js").read_text(encoding="utf-8")
for value in re.findall(r'"(\./[^"\n]+)"', sw):
    target = ROOT / value[2:]
    if value == "./":
        continue
    if not target.exists():
        errors.append(f"Service worker missing asset: {value}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print("static-audit: PASS")
