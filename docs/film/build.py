"""Fill film.template.html from docs/demo-transcript.json and render it frame by frame.

usage: python3 build.py <demo-transcript.json> <out_basename> [--preview ms,ms,...]
"""
import html, json, pathlib, subprocess, sys, shutil
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
transcript = json.load(open(sys.argv[1]))
out = sys.argv[2]
preview = sys.argv[4].split(",") if len(sys.argv) > 4 and sys.argv[3] == "--preview" else None

steps = {s["title"][0]: [e for e in s["events"] if e["kind"] == "tool"] for s in transcript["steps"]}
search, pull, _fb = steps["1"]
own = steps["2"][0]
miss = steps["3"][0]
receipt = pull["response_text"].splitlines()[-1]
price = receipt.split("$")[1].split(" ")[0]
rid = receipt.split("Receipt ")[1].split(".")[0]
pages = pull["response_text"].splitlines()[0].split("(")[1].split(")")[0]
pull_body = "\n".join(pull["response_text"].splitlines()[:-1])  # receipt shown separately
e = html.escape

def qargs(q, n=58):
    return e(f'query: "{q[:n]}…"' if len(q) > n else f'query: "{q}"')

# Act 1: illustrative research sessions on overlapping topics (fictional people)
cards = [
    ("@mara", "Oct 2026", "<b>USDC vs PYUSD vs USDe</b> for a company treasury", "2 days · 3.8M tokens"),
    ("@jtan", "Sep 2026", "Which stablecoins can a company <b>redeem at par</b>?", "3 days · 5.1M tokens"),
    ("@devon", "Oct 2026", "<b>GENIUS Act</b>: what changes for issuers in 2027", "1 day · 2.2M tokens"),
    ("@priya", "Aug 2026", "How does an <b>x402 payment</b> actually settle?", "2 days · 2.9M tokens"),
    ("@lu", "Oct 2026", "Stablecoin <b>reserve attestations</b>, compared", "2 days · 4.4M tokens"),
    ("@sam", "Nov 2026", "Is <b>USDe</b> safe for a corporate treasury?", "1 day · 1.7M tokens"),
    ("@ola", "Nov 2026", "<b>PYUSD vs USDC</b> redemption fees and timing", "2 days · 3.2M tokens"),
]
pos = [(90, 80), (520, 50), (850, 150), (150, 310), (560, 290), (860, 430), (330, 510)]
cards_html = []
for i, ((who, date, title, meta), (x, y)) in enumerate(zip(cards, pos)):
    t_in = 300 + i * 620
    cards_html.append(
        f'<div class="el dim card" style="left:{x}px;top:{y}px;--in:{t_in}ms;--dim:{t_in + 1100}ms;--out:5800ms">'
        f'<div class="k"><span>research session · {who}</span><span>{date}</span></div>'
        f'<div class="t">{title}</div><div class="m">{meta}</div></div>')

# Act 3: network rows, real results for the demo query
rows = [("kestrel", "stablecoin issuers compared", "6 pages", f"match · ${price}", "ok"),
        ("otter (you)", "agent payments, x402", "5 pages", "no match", "no"),
        ("heron", "UK heat pump retrofit", "4 pages", "no match", "no")]
rows_html = []
for i, (h, topic, n, res, cls) in enumerate(rows):
    t_in, top = 20200 + i * 300, 268 + i * 44
    rows_html.append(
        f'<div class="el row" style="left:255px;top:{top}px;--in:{t_in}ms;--out:26600ms">'
        f'<span>{h}</span><span class="p">{topic}</span><span class="p">{n}</span>'
        f'<span class="st"><span class="el chk" style="--in:{t_in + 200}ms;--out:{22300 + i * 120}ms;--dy:0px">checking…</span>'
        f'<span class="el {cls}" style="--in:{22600 + i * 120}ms;--dy:0px">{res}</span></span></div>')
rows_html.append('<div class="hl" style="left:255px;top:303px;width:770px;--in:22900ms;--out:26600ms"></div>')

page = (here / "film.template.html").read_text()
for k, v in {
    "__CARDS__": "\n".join(cards_html), "__ROWS__": "\n".join(rows_html),
    "__Q1__": e(search["args"]["query"]), "__Q1ARGS__": qargs(search["args"]["query"]),
    "__Q2ARGS__": qargs(own["args"]["query"], 48), "__Q3ARGS__": qargs(miss["args"]["query"], 48),
    "__SEARCH__": e(search["response_text"]), "__PULL__": e(pull_body), "__OWN__": e(own["response_text"]),
    "__PRICE__": price, "__RID__": rid, "__PAGES__": pages, "__SCROLL__": "90",
}.items():
    page = page.replace(k, v)
(here / "film.html").write_text(page)

FPS, END_MS = 30, 53000
frames = here / "frames"
shutil.rmtree(frames, ignore_errors=True)
frames.mkdir()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1.5)
    pg.goto(f"file://{here / 'film.html'}")
    pg.evaluate("document.fonts.ready")
    times = [int(t) for t in preview] if preview else [round(i * 1000 / FPS) for i in range(int(END_MS * FPS / 1000))]
    for i, t in enumerate(times):
        pg.evaluate(f"window.seek({t})")
        pg.screenshot(path=str(frames / f"f{i:05d}.png"))
    b.close()
if preview:
    print("preview frames", len(times)); sys.exit()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%05d.png"),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", f"{out}.mp4"], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{out}.mp4",
                "-vf", "fps=15,scale=1080:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
                f"{out}.gif"], check=True)
print("done", out)
