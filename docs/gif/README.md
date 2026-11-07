# Rendering the GIFs

The chat GIF replays `docs/demo-transcript.json` in a mockup chat window. Tool
calls and tool responses come from the transcript unchanged. The user and
assistant lines are written in `build_script.py`.

```sh
npm run demo -- --transcript docs/demo-transcript.json
cd docs/gif
python3 build_script.py ../demo-transcript.json chat-script.json
python3 record.py chat-script.json ../images/cloud-brain-chat chat.html
```

The terminal GIF replays the output of `npm run demo`:

```sh
node --import tsx src/demo.ts > /tmp/demo.txt
cd docs/gif
python3 -c "import json;json.dump(open('/tmp/demo.txt').read().rstrip().split('\n'),open('term-script.json','w'))"
python3 record.py term-script.json ../images/cloud-brain-terminal term.html
```

Needs Python with Playwright, a Chrome or Chromium build and ffmpeg. `record.py`
expects Chrome at `/usr/bin/google-chrome`; change `executable_path` if yours is
elsewhere.
