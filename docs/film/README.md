# Rendering the README film

`film.template.html` is a single page with CSS animations. `build.py` fills it
from `docs/demo-transcript.json`, seeks the animations frame by frame in
headless Chrome, and writes an MP4 and a GIF.

What comes from the transcript, unchanged: the query, every tool response, the
price, the receipt id and the page count. What is written by hand: the
illustrative research-session cards at the start, the captions, the chat
window and the assistant's lines. The network table shows the real match
result for the demo query against the three sample wikis.

```sh
cd docs/film
npm install                      # fonts only
pip install playwright           # plus Chrome or Chromium and ffmpeg
python3 build.py ../demo-transcript.json ../images/cloud-brain-film
```

`build.py` expects Chrome at `/usr/bin/google-chrome`. Change
`executable_path` if yours is elsewhere.
