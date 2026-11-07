import { z } from "zod";

/** Default tools: search, pull, feedback. */
export const DEFAULT_TOOLS = [
  {
    name: "cloud_brain_search",
    description:
      "Check published research wikis for compiled work on the current topic. Use during deep research (market maps, technical deep dives, multi-session topics), not for quick facts or simple coding. Checks the user's own wiki first, then other contributors. Low-noise by design: returns an empty result unless there is a confident match. If a match from someone else is found, tell the user what it covers and its simulated USDC price, and ask before pulling.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The research question, in plain words." }
      },
      required: ["query"]
    }
  },
  {
    name: "cloud_brain_pull",
    description:
      "Bring matched research into the session as a short synthesis with citations. Pages from the user's own wiki are free. Pages from other contributors cost a simulated USDC amount (no real money moves) and return a receipt id; the pull is refused if it would break the per-pull limit or monthly budget. Pass the contributor handle from cloud_brain_search to pull that contributor's work.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Same question you searched for." },
        contributor: { type: "string", description: "Contributor handle from the search result." },
        max_price_usdc: { type: "number", description: "Optional lower price cap for this pull." }
      },
      required: ["query"]
    }
  },
  {
    name: "cloud_brain_feedback",
    description:
      "Record whether a paid pull helped, using its receipt id. Feedback moves the contributor's reputation, which affects ranking and price.",
    inputSchema: {
      type: "object",
      properties: {
        receipt_id: { type: "string" },
        useful: { type: "boolean" },
        rating: { type: "number", description: "Optional 1 to 5." },
        comment: { type: "string" }
      },
      required: ["receipt_id", "useful"]
    }
  }
] as const;

/** Extra tools behind CLOUD_BRAIN_MARKETPLACE=true: explicit quotes, history, summary. */
export const MARKETPLACE_TOOLS = [
  {
    name: "cloud_brain_quote",
    description:
      "Get a simulated USDC price quote for another contributor's matching research without pulling it. Quotes expire.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, contributor: { type: "string" } },
      required: ["query"]
    }
  },
  {
    name: "cloud_brain_settle",
    description: "Pay a quote (simulated USDC) and pull the quoted research.",
    inputSchema: {
      type: "object",
      properties: { quote_id: { type: "string" } },
      required: ["quote_id"]
    }
  },
  {
    name: "cloud_brain_history",
    description: "List recent simulated payments and any feedback on them.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } }
    }
  },
  {
    name: "cloud_brain_marketplace_summary",
    description: "Totals across all simulated payments, feedback, and top contributors by simulated earnings.",
    inputSchema: { type: "object", properties: {} }
  }
] as const;

export const searchArgs = z.object({ query: z.string().min(3).max(800) });

export const pullArgs = z.object({
  query: z.string().min(3).max(2000),
  contributor: z.string().max(80).optional(),
  max_price_usdc: z.number().min(0).max(100).optional()
});

export const feedbackArgs = z.object({
  receipt_id: z.string().min(5).max(80),
  useful: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(1500).optional()
});

export const quoteArgs = z.object({
  query: z.string().min(3).max(2000),
  contributor: z.string().max(80).optional()
});

export const settleArgs = z.object({ quote_id: z.string().uuid() });

export const historyArgs = z.object({ limit: z.number().int().min(1).max(100).optional() });
