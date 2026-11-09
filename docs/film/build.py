"""Build the 24 s portfolio clip from docs/demo-transcript.json.

usage: python3 build.py <demo-transcript.json> <outdir> [--preview ms,ms,...]
"""
import html, json, pathlib, shutil, subprocess, sys
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
tr = json.load(open(sys.argv[1]))
outdir = pathlib.Path(sys.argv[2]); outdir.mkdir(parents=True, exist_ok=True)
preview = sys.argv[4].split(",") if len(sys.argv) > 4 and sys.argv[3] == "--preview" else None
e = html.escape

steps = {s["title"][0]: [x for x in s["events"] if x["kind"] == "tool"] for s in tr["steps"]}
search, pull, _ = steps["1"]
miss = steps["3"][0]
assert miss["response_text"].strip() == "", "miss query must return an empty result"

def prefix(q, n):  # verbatim prefix, cut at a word boundary
    return q if len(q) <= n else q[:q.rfind(" ", 0, n)].rstrip(":,;") + "…"

s_lines = search["response_text"].splitlines()
found = s_lines[0].split(". ")[0] + "."           # "Found compiled research from Kestrel."
price_line = next(l for l in s_lines if l.startswith("Price:"))
to_pull = next(l for l in s_lines if l.startswith("To pull:"))
p_lines = pull["response_text"].splitlines()
# "[S1] Page title": the full H1 of each cited page, read from the sample wiki
wiki = here.parent.parent / "sample-wikis" / pull["args"]["contributor"] / "pages"
src_files = next(l for l in p_lines if l.startswith("Sources:")).removeprefix("Sources:").split(",")
cites = [f"[S{i + 1}] " + (wiki / f.strip()).read_text().splitlines()[0].lstrip("# ").strip() for i, f in enumerate(src_files[:3])]
receipt = p_lines[-1]
price = receipt.split("$")[1].split(" ")[0]

# Shot 1: illustrative research sessions on the same topic (no names, no dates)
cards = [("How big is the <b>shadow tanker fleet</b>, really?", "2 days · 3.8M tokens", 60, 140),
         ("Does the <b>oil price cap</b> still bite?", "3 days · 5.1M tokens", 190, 262),
         ("Which <b>tanker sanctions</b> actually worked?", "2 days · 3.2M tokens", 300, 384)]
cards_html = "".join(
    f'<div class="el dim card" style="left:{x}px;top:{y}px;--in:{-700 if i == 0 else 300 + i * 700}ms;--dim:{1300 + i * 700 if i < 2 else 99999}ms;--out:4100ms">'
    f'<div class="k"><span>illustrative research session</span></div><div class="t">{t}</div><div class="m">{m}</div></div>'
    for i, (t, m, x, y) in enumerate(cards))

# Shot 2: the global network. Coordinates come from places.json (generated once from
# world-atlas land-110m with d3-geo's Natural Earth projection, 712x330).
places = json.load(open(here / "places.json"))
lx, ly = places["London"]
sx, sy = places["Singapore"]
others = ["New York", "San Francisco", "Mexico City", "São Paulo", "Lagos", "Nairobi", "Berlin", "Dubai", "Mumbai", "Seoul", "Tokyo", "Sydney"]

def curve(x1, y1, x2, y2):
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2 - abs(x2 - x1) * 0.18 - 10
    return f"M{x1},{y1} Q{mx:.1f},{my:.1f} {x2},{y2}"

nodes_html = "".join(f'<circle class="node" cx="{places[c][0]}" cy="{places[c][1]}" r="3.6" style="--in:{4900 + i * 90}ms"/>' for i, c in enumerate(others))
lines_html = "".join(f'<path class="ln2" d="{curve(lx, ly, *places[c])}" style="--in:{5250 + i * 110}ms"/>' for i, c in enumerate(others))
lines_html += f'<path class="ln2 win" d="{curve(lx, ly, sx, sy)}" style="--in:6750ms"/>'
seller_meta = json.load(open(here.parent.parent / "sample-wikis" / pull["args"]["contributor"] / "contributor.json"))
seller = f'{seller_meta["name"]} · {seller_meta["location"]}'
kpages = len(list((here.parent.parent / "sample-wikis" / pull["args"]["contributor"] / "pages").glob("*.md")))

page = (here / "clip.template.html").read_text()
for k, v in {"__CARDS__": cards_html, "__LINES__": lines_html, "__NODES__": nodes_html,
             "__LX__": str(lx), "__LY__": str(ly), "__SX__": str(sx), "__SY__": str(sy),
             "__LTX__": str(round(lx + 12)), "__LTY__": str(round(ly - 30)), "__HCX__": str(round(sx - 262)), "__HCY__": str(round(sy + 16)),
             "__SELLER__": e(seller), "__KPAGES__": str(kpages), "__Q1LONG__": e(prefix(search["args"]["query"], 150)),
             "__Q3SHORT__": e(prefix(miss["args"]["query"], 70)),
             "__S_FOUND__": e(found), "__S_PRICE__": e(price_line), "__S_TOPULL__": e(to_pull),
             "__P_HEAD__": e(p_lines[0]), "__P_S1__": e(cites[0]), "__P_S2__": e(cites[1]), "__P_S3__": e(cites[2]),
             "__RECEIPT__": e(receipt), "__PRICE__": price}.items():
    page = page.replace(k, v)
(here / "clip.html").write_text(page)

FPS, END = 30, 24600
frames = here / "frames"; shutil.rmtree(frames, ignore_errors=True); frames.mkdir()
times = [int(t) for t in preview] if preview else [round(i * 1000 / FPS) for i in range(END * FPS // 1000)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 800, "height": 550}, device_scale_factor=2)
    pg.goto(f"file://{here / 'clip.html'}"); pg.evaluate("document.fonts.ready")
    for i, t in enumerate(times):
        pg.evaluate(f"window.seek({t})"); pg.screenshot(path=str(frames / f"f{i:05d}.png"))
    b.close()
if preview:
    sys.exit()
ff = ["ffmpeg", "-y", "-loglevel", "error"]
subprocess.run(ff + ["-framerate", str(FPS), "-i", str(frames / "f%05d.png"), "-c:v", "libx264", "-preset", "veryfast",
                     "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(outdir / "cloud-brain.mp4")], check=True)
subprocess.run(ff + ["-i", str(outdir / "cloud-brain.mp4"), "-vf", "scale=-2:1080,pad=1920:1080:(ow-iw)/2:0:color=0xfafaf8",
                     "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
                     str(outdir / "cloud-brain-16x9.mp4")], check=True)
subprocess.run(ff + ["-i", str(frames / f"f{int(3.4 * FPS):05d}.png"), "-q:v", "3", str(outdir / "cloud-brain-poster.jpg")], check=True)
subprocess.run(ff + ["-i", str(outdir / "cloud-brain.mp4"), "-vf",
                     "fps=15,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
                     str(outdir / "cloud-brain-clip.gif")], check=True)
print("done", outdir)
