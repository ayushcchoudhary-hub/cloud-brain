"""Turn docs/demo-transcript.json into the scene list that chat.html replays.

Tool calls and tool responses are copied from the transcript unchanged.
The cards, step banners and the user and assistant lines below are written by
hand: that is the mockup part.

usage: python3 build_script.py ../demo-transcript.json chat-script.json
"""
import json
import sys


def short_args(args):
    parts = []
    if "query" in args:
        q = args["query"]
        parts.append(f'query: "{q[:46]}…"' if len(q) > 46 else f'query: "{q}"')
    if "contributor" in args:
        parts.append(f'contributor: "{args["contributor"]}"')
    return ", ".join(parts)


def tool(event, hold):
    return {"kind": "tool", "name": event["tool"], "args": short_args(event["args"]),
            "response": event["response_text"], "hold": hold}


def say(kind, text, hold):
    return {"kind": kind, "text": text, "hold": hold}


def step(n, title, sub):
    return {"kind": "step", "n": n, "title": title, "sub": sub, "hold": 900}


transcript = json.load(open(sys.argv[1]))
steps = {s["title"][0]: [e for e in s["events"] if e["kind"] == "tool"] for s in transcript["steps"]}

network_search, network_pull, _feedback = steps["1"]
own_search = steps["2"][0]
miss_search = steps["3"][0]

seller = network_pull["args"]["contributor"].capitalize()
receipt_line = network_pull["response_text"].splitlines()[-1]   # "SIMULATED payment: $3.96 USDC to Kestrel. Receipt sim_..."
amount = receipt_line.split("$")[1].split(" ")[0]
receipt_id = receipt_line.split("Receipt ")[1].split(".")[0]
pages = network_pull["response_text"].splitlines()[0].split("(")[1].split(")")[0]  # "3 pages"

scenes = [
    {"kind": "card", "kicker": "Cloud Brain · April 2026 prototype",
     "title": "Your AI agent reuses research someone else already compiled, and pays a few dollars for it.",
     "body": "An MCP server. People publish their research wikis. When your agent hits a topic someone covered in depth, "
             "it offers to pull that work in instead of re-deriving it.",
     "meta": "mockup chat window · tool calls and responses are real server output · payments simulated in USDC",
     "hold": 4200},
    step("1 / 3", "Someone already did this research",
         "pay a few dollars for days of compiled work, instead of starting from zero"),
    say("user", network_search["args"]["query"], 500),
    tool(network_search, 1800),
    say("assistant", f"{seller} has already compiled {pages} on this. Pulling them costs ${amount} USDC (simulated). Want me to pull them in?", 900),
    say("user", "yes, pull it in", 400),
    tool(network_pull, 2800),
    say("receipt", f"SIMULATED  ${amount} USDC -> {seller}  ·  receipt {receipt_id}  ·  no real funds moved", 700),
    say("assistant", f"Short version from {seller}'s notes: Circle discloses USDC reserves weekly, with monthly Big Four assurance. "
                     "A USDe treasury effectively relies on market makers to hold the $1 price. New OCC reserve rules start "
                     "in January 2027. [S2] [S3]", 3200),
    {"kind": "clear", "title": "research session · new question", "hold": 300},
    step("2 / 3", "Your own notes come first", "if your wiki already covers it, the pull is free"),
    say("user", own_search["args"]["query"], 400),
    tool(own_search, 2000),
    say("assistant", "Your own wiki already covers this, so it is free. Want me to pull your notes in?", 2400),
    {"kind": "clear", "title": "research session · new question", "hold": 300},
    step("3 / 3", "Nothing relevant, so it stays quiet", "no weak matches, no noise, nothing charged"),
    say("user", miss_search["args"]["query"], 400),
    tool(miss_search, 1400),
    say("assistant", "I'll research this from scratch. Start with which policies a Type I report covers and how the scope is set.", 2600),
    {"kind": "card", "kicker": "What you just saw",
     "title": "Real server, simulated money.",
     "bullets": ["Search, the confidence gate, pricing, budgets and receipts are real code: run npm run demo",
                 "Payments never touch a chain. Contributors are fictional sample wikis",
                 "Shelved: re-deriving research got cheaper, people want to steer it, and paying before you can judge quality needs reputation"],
     "meta": "github.com/ayushcchoudhary-hub/cloud-brain", "hold": 5500, "keep": True},
]
json.dump(scenes, open(sys.argv[2], "w"), indent=1)
