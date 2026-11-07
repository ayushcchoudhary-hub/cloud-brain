"""Turn docs/demo-transcript.json into the scene list that chat.html replays.

Tool calls and tool responses are copied from the transcript unchanged.
The user and assistant lines below are written by hand: that is the mockup part.

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


transcript = json.load(open(sys.argv[1]))
steps = {s["title"][0]: [e for e in s["events"] if e["kind"] == "tool"] for s in transcript["steps"]}

network_search, network_pull, _feedback = steps["1"]
own_search = steps["2"][0]
miss_search = steps["3"][0]

seller = network_pull["args"]["contributor"].capitalize()
receipt_line = network_pull["response_text"].splitlines()[-1]   # "SIMULATED payment: $3.27 USDC to Wren. Receipt sim_..."
amount = receipt_line.split("$")[1].split(" ")[0]
receipt_id = receipt_line.split("Receipt ")[1].split(".")[0]
pages = network_pull["response_text"].splitlines()[0].split("(")[1].split(")")[0]  # "3 pages"

scenes = [
    say("user", network_search["args"]["query"], 500),
    tool(network_search, 1600),
    say("assistant", f"{seller} already compiled {pages} on this. Pulling them costs ${amount} USDC (simulated). Want me to pull them in?", 900),
    say("user", "yes, pull it in", 400),
    tool(network_pull, 2600),
    say("receipt", f"SIMULATED  ${amount} USDC -> {seller}  ·  receipt {receipt_id}  ·  no real funds moved", 700),
    say("assistant", f"Short version from {seller}'s notes: label a small query set from real failures, measure retrieval "
                     "with recall@k first, then grade answers only where retrieval worked. [S2] [S3]", 2600),
    {"kind": "clear", "title": "research session · new question", "hold": 300},
    say("user", own_search["args"]["query"], 400),
    tool(own_search, 1800),
    say("assistant", "Your own wiki already covers this, so it is free. Want me to pull your notes in?", 2200),
    {"kind": "clear", "title": "research session · new question", "hold": 300},
    say("user", miss_search["args"]["query"], 400),
    tool(miss_search, 1400),
    say("assistant", "I'll research this from scratch. Start with the lease length, break clauses and how rent reviews work.", 2500),
]
json.dump(scenes, open(sys.argv[2], "w"), indent=1)
