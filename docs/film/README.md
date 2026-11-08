# Rendering the README clip

`clip.template.html` is one page with CSS animations, six shots, 24 seconds.
`build.py` fills it from `docs/demo-transcript.json`, seeks the animations
frame by frame in headless Chrome, and writes an MP4, a 16:9 version, a poster
frame and the README GIF.

From the transcript, word for word but trimmed to the lines that matter: the
query, the search and pull responses, the price and the receipt. The network
table shows the real match result for the demo query against the three sample
wikis. Written by hand: the captions and the three research-session cards in
the first shot, which are labelled "illustrative" on screen.

```sh
cd docs/film
npm install                      # fonts only
pip install playwright           # plus Chrome or Chromium and ffmpeg
python3 build.py ../demo-transcript.json out
cp out/cloud-brain-clip.gif ../images/
```

`build.py` expects Chrome at `/usr/bin/google-chrome`. Change
`executable_path` if yours is elsewhere.
