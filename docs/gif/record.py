"""Record an HTML replay page into an MP4 + GIF.
usage: python3 record.py script.json out_basename [page.html]  (default chat.html)
"""
import json, subprocess, sys, time, pathlib, shutil
from playwright.sync_api import sync_playwright

script_path, out = sys.argv[1], sys.argv[2]
HTML = sys.argv[3] if len(sys.argv) > 3 else "chat.html"
here = pathlib.Path(__file__).parent
frames = here / "frames"
shutil.rmtree(frames, ignore_errors=True)
frames.mkdir()
script = json.loads(pathlib.Path(script_path).read_text())

FPS = 12
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    page = b.new_page(viewport={"width": 960, "height": 600}, device_scale_factor=2)
    page.add_init_script(f"window.SCRIPT = {json.dumps(script)};")
    page.goto(f"file://{here / HTML}")
    i, t0 = 0, time.time()
    while True:
        page.screenshot(path=str(frames / f"f{i:05d}.png"))
        i += 1
        target = t0 + i / FPS
        delay = target - time.time()
        if delay > 0:
            time.sleep(delay)
        if page.evaluate("window.DONE === true"):
            for _ in range(FPS * 3):  # hold last frame 3s
                page.screenshot(path=str(frames / f"f{i:05d}.png")); i += 1
            break
        if i > FPS * 120:
            break
    b.close()

subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%05d.png"),
                "-vf", "scale=1920:-2", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", f"{out}.mp4"], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%05d.png"),
                "-vf", "scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
                f"{out}.gif"], check=True)
print("frames", i, "->", out)
