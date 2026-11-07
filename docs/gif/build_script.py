import json, sys
d = json.load(open(sys.argv[1]))
steps = {s['title'][0]: s['events'] for s in d['steps']}
def tool(e, hold=1400):
    a = e['args']; q = a.get('query')
    args = (f'query: "{q[:46]}…"' if q and len(q) > 46 else f'query: "{q}"') if q else ''
    if 'contributor' in a: args = (args + ', ' if args else '') + f'contributor: "{a["contributor"]}"'
    if 'receipt_id' in a: args = f'receipt: {a["receipt_id"]}, useful: true, rating: 5'
    return {"kind": "tool", "name": e['tool'], "args": args, "response": e['response_text'], "hold": hold}
s1 = steps['1']; search, _, pull, fb = s1
receipt = pull['response_text'].split('\n')[-1]
amt = receipt.split('$')[1].split(' ')[0]; rid = receipt.split('Receipt ')[1].split('.')[0]
s2 = steps['2'][0]; s3 = steps['3'][0]
out = [
  {"kind": "user", "text": search['args']['query'], "hold": 500},
  tool(search, 1600),
  {"kind": "assistant", "text": f"Wren already compiled 3 pages on this. Pulling them costs ${amt} USDC (simulated). Want me to pull them in?", "hold": 900},
  {"kind": "user", "text": "yes, pull it in", "hold": 400},
  tool(pull, 2600),
  {"kind": "receipt", "text": f"SIMULATED  ${amt} USDC -> Wren  ·  receipt {rid}  ·  no real funds moved", "hold": 700},
  {"kind": "assistant", "text": "Short version from Wren's notes: label a small query set from real failures, measure retrieval with recall@k first, then grade answers only where retrieval worked. [S2] [S3]", "hold": 2600},
  {"kind": "clear", "title": "research session · new question", "hold": 300},
  {"kind": "user", "text": s2['args']['query'], "hold": 400},
  tool(s2, 1800),
  {"kind": "assistant", "text": "Your own wiki already covers this, so no charge. Pulling your notes first.", "hold": 2200},
  {"kind": "clear", "title": "research session · new question", "hold": 300},
  {"kind": "user", "text": s3['args']['query'], "hold": 400},
  tool(s3, 1400),
  {"kind": "assistant", "text": "Nobody in the network has compiled this, so nothing to buy. I'll research it from scratch.", "hold": 2500},
]
json.dump(out, open(sys.argv[2], 'w'), indent=1)
