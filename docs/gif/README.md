# Rendering the terminal GIF

The terminal GIF replays the output of `npm run demo` line by line.

```sh
node --import tsx src/demo.ts > /tmp/demo.txt
cd docs/gif
python3 -c "import json;json.dump(open('/tmp/demo.txt').read().rstrip().split('\n'),open('term-script.json','w'))"
python3 record.py term-script.json ../images/cloud-brain-terminal term.html
```

Needs Python with Playwright, a Chrome or Chromium build and ffmpeg. `record.py`
expects Chrome at `/usr/bin/google-chrome`; change `executable_path` if yours is
elsewhere. The README film is rendered separately, from `docs/film`.
