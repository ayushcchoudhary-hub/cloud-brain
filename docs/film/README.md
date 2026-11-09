# Rendering the README clip

`clip.template.html` is one page with CSS animations, six shots, about 25 seconds.
`build.py` fills it from `docs/demo-transcript.json`, seeks the animations
frame by frame in headless Chrome, and writes an MP4, a 16:9 version, a poster
frame and the README GIF.

From the transcript, word for word but trimmed to the lines that matter: the
query, the search and pull responses, the price and the receipt. On the map,
your dot (London) and the matched contributor (Singapore) come from the sample
wikis' `contributor.json` files, and the match and price are the real result.
Written by hand: the captions, the research-session cards in the first shot and
the grey dots on the map. Both are labelled "illustrative" on screen.

`world-dots.svg` and `places.json` were generated once from the world-atlas
`land-110m` data with d3-geo's Natural Earth projection, so the build needs no
map libraries.

```sh
cd docs/film
npm install                      # fonts only
pip install playwright           # plus Chrome or Chromium and ffmpeg
python3 build.py ../demo-transcript.json out
cp out/cloud-brain-clip.gif ../images/
```

`build.py` expects Chrome at `/usr/bin/google-chrome`. Change
`executable_path` if yours is elsewhere.
